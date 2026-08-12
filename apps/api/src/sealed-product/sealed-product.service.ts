import {
  localizedSealedNameSql,
  sealedProductNameMatchesSql,
} from "src/card/card-search";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "src/translation/supported-locales";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  type DatasetSealedProduct,
  readSealedProducts,
  sealedProductsFile,
} from "@repo/pokemon-dataset";
import { Listing } from "src/marketplace/entities/listing.entity";
import { PriceHistory } from "src/marketplace/entities/price-history.entity";
import {
  SealedEvent,
  SealedEventType,
} from "src/marketplace/entities/sealed-event.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { DataSource, In, MoreThan, Repository } from "typeorm";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { CreateSealedProductDto } from "./dto/create-sealed-product.dto";
import {
  SealedProductFilterDto,
  SealedSortBy,
} from "./dto/sealed-product-filter.dto";
import { UpdateSealedProductDto } from "./dto/update-sealed-product.dto";
import {
  SealedProduct,
  SealedProductContents,
} from "./entities/sealed-product.entity";
import { SealedProductLocale } from "./entities/sealed-product-locale.entity";
import { SealedProductType } from "./enums/sealed-product-type.enum";

export interface SealedSeedReport {
  totalRecords: number;
  inserted: number;
  updated: number;
  matchedSets: number;
  unmatchedSetNames: string[];
  /** Number of products named in each locale. */
  translations: Record<string, number>;
}

// Event weights used to calculate popularity scores for sealed products.
const SEALED_EVENT_WEIGHTS: Record<SealedEventType, number> = {
  [SealedEventType.VIEW]: 1,
  [SealedEventType.SEARCH]: 2,
  [SealedEventType.FAVORITE]: 5,
  [SealedEventType.ADD_TO_CART]: 10,
  [SealedEventType.SALE]: 50,
};

const POPULARITY_WINDOW_DAYS = parseInt(
  process.env.POPULARITY_WINDOW_DAYS || "90",
  10,
);

@Injectable()
export class SealedProductService {
  constructor(
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(SealedEvent)
    private readonly sealedEventRepository: Repository<SealedEvent>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new sealed product entity along with its localized name entries.
   *
   * @param dto Sealed product creation parameters.
   * @returns Newly created SealedProduct.
   */
  async create(dto: CreateSealedProductDto): Promise<SealedProduct> {
    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(SealedProduct, {
        id: dto.id,
        productType: dto.productType,
        pokemonSet: dto.pokemonSetId
          ? ({ id: dto.pokemonSetId } as never)
          : null,
        contents: (dto.contents ?? null) as SealedProductContents | null,
        sku: dto.sku,
        upc: dto.upc,
        image: dto.image,
      });
      await manager.save(product);

      const locales = dto.locales.map((l) =>
        manager.create(SealedProductLocale, {
          sealedProductId: product.id,
          locale: l.locale,
          name: l.name,
        }),
      );
      await manager.save(locales);

      return this.findOneOrFail(dto.id, manager.getRepository(SealedProduct));
    });
  }

  /**
   * Retrieves all sealed products matching the provided filters.
   *
   * @param filter Query filter parameters.
   * @returns Array of sealed products.
   */
  async findAll(filter: SealedProductFilterDto = {}): Promise<SealedProduct[]> {
    const qb = await this.buildFilteredQuery(filter);
    return qb.getMany();
  }

  /**
   * Retrieves a paginated list of sealed products matching filter criteria.
   *
   * @param filter Query and pagination parameters.
   * @returns Paginated result object.
   */
  async findAllPaginated(
    filter: SealedProductFilterDto = {},
  ): Promise<PaginatedResult<SealedProduct>> {
    const qb = await this.buildFilteredQuery(filter);
    const { sort, order } = this.resolveSort(filter.sortBy);
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page: filter.page, limit: filter.limit },
      sort,
      order,
    );
  }

  /**
   * Returns the N most recently created sealed products.
   *
   * @param limit Maximum number of products to return.
   * @returns Array of recent sealed products.
   */
  async findRecent(limit = 8): Promise<SealedProduct[]> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    return this.sealedProductRepository.find({
      relations: ["pokemonSet", "locales"],
      order: { createdAt: "DESC" },
      take: safeLimit,
    });
  }

  /**
   * Finds a sealed product by ID.
   *
   * @param id Product ID.
   * @returns Sealed product entity.
   */
  async findOne(id: string): Promise<SealedProduct> {
    return this.findOneOrFail(id);
  }

  /**
   * Returns market statistics and price history for a given sealed product.
   *
   * @param id Product ID.
   * @returns Market aggregate statistics.
   */
  async getStatistics(id: string) {
    const product = await this.sealedProductRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`SealedProduct ${id} not found`);
    }

    const stats = await this.listingRepository
      .createQueryBuilder("listing")
      .select("COUNT(listing.id)", "totalListings")
      .addSelect("MIN(listing.price)", "minPrice")
      .addSelect("MAX(listing.price)", "maxPrice")
      .addSelect("AVG(listing.price)", "avgPrice")
      .addSelect("SUM(listing.quantityAvailable)", "totalStock")
      .where("listing.sealedProduct.id = :id", { id })
      .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :now)", {
        now: new Date(),
      })
      .andWhere("listing.quantityAvailable > 0")
      .getRawOne();

    const totalListings = parseInt(stats?.totalListings, 10) || 0;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const priceHistory = await this.priceHistoryRepository.find({
      where: {
        sealedProduct: { id },
        recordedAt: MoreThan(ninetyDaysAgo),
      },
      order: { recordedAt: "ASC" },
      take: 100,
    });

    return {
      sealedProductId: id,
      totalListings,
      totalStock: parseInt(stats?.totalStock, 10) || 0,
      minPrice: stats?.minPrice ? parseFloat(stats.minPrice) : null,
      maxPrice: stats?.maxPrice ? parseFloat(stats.maxPrice) : null,
      avgPrice: stats?.avgPrice
        ? Math.round(parseFloat(stats.avgPrice) * 100) / 100
        : null,
      priceHistory: priceHistory.map((h) => ({
        price: parseFloat(h.price.toString()),
        currency: h.currency,
        recordedAt: h.recordedAt,
      })),
    };
  }

  /**
   * Updates an existing sealed product entity.
   *
   * @param id Product ID.
   * @param dto Update parameters DTO.
   * @returns Updated SealedProduct.
   */
  async update(
    id: string,
    dto: UpdateSealedProductDto,
  ): Promise<SealedProduct> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SealedProduct);
      const existing = await this.findOneOrFail(id, repo);

      Object.assign(existing, {
        productType: dto.productType ?? existing.productType,
        contents: (dto.contents ??
          existing.contents) as SealedProductContents | null,
        sku: dto.sku ?? existing.sku,
        upc: dto.upc ?? existing.upc,
        image: dto.image ?? existing.image,
        pokemonSet:
          dto.pokemonSetId !== undefined
            ? dto.pokemonSetId
              ? ({ id: dto.pokemonSetId } as never)
              : null
            : existing.pokemonSet,
      });
      await repo.save(existing);

      if (dto.locales) {
        await manager.delete(SealedProductLocale, { sealedProductId: id });
        const locales = dto.locales.map((l) =>
          manager.create(SealedProductLocale, {
            sealedProductId: id,
            locale: l.locale,
            name: l.name,
          }),
        );
        await manager.save(locales);
      }

      return this.findOneOrFail(id, repo);
    });
  }

  /**
   * Deletes a sealed product by ID.
   *
   * @param id Product ID.
   */
  async remove(id: string): Promise<void> {
    const result = await this.sealedProductRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`SealedProduct ${id} not found`);
    }
  }

  /**
   * Builds filtered QueryBuilder query. Conditionally joins listings when price filter or sorting applies.
   */
  private async buildFilteredQuery(filter: SealedProductFilterDto) {
    const qb = this.sealedProductRepository
      .createQueryBuilder("sealedProduct")
      .leftJoinAndSelect("sealedProduct.pokemonSet", "pokemonSet")
      .leftJoinAndSelect("pokemonSet.serie", "serie")
      .leftJoinAndSelect("sealedProduct.locales", "locales");

    if (filter.setId) {
      qb.andWhere("pokemonSet.id = :setId", { setId: filter.setId });
    }
    if (filter.seriesId) {
      qb.andWhere("serie.id = :seriesId", { seriesId: filter.seriesId });
    }
    if (filter.productType) {
      qb.andWhere("sealedProduct.productType = :productType", {
        productType: filter.productType,
      });
    }
    if (filter.search) {
      // Matched across every locale and diacritic-insensitively, like cards.
      qb.andWhere(
        `(${sealedProductNameMatchesSql("sealedProduct")}
          OR LOWER(sealedProduct.sku) LIKE :search)`,
        { search: `%${filter.search.toLowerCase()}%` },
      );
    }

    const sortsByName = !filter.sortBy || filter.sortBy === SealedSortBy.NAME;
    if (sortsByName) {
      // The product carries no name: ordering goes through the translation of
      // the default locale, as the marketplace listing sort already does.
      qb.addSelect(localizedSealedNameSql("sealedProduct"), "localized_name");
      qb.setParameter("sortLocale", DEFAULT_LOCALE);
    }

    if (filter.sortBy === SealedSortBy.POPULARITY) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - POPULARITY_WINDOW_DAYS);

      const weightCase = Object.entries(SEALED_EVENT_WEIGHTS)
        .map(([type, weight]) => `WHEN '${type}' THEN ${weight}`)
        .join(" ");

      qb.leftJoin(
        "sealed_event",
        "popularityEvent",
        'popularityEvent.sealed_product_id = sealedProduct.id AND popularityEvent."createdAt" >= :popularityCutoff',
        { popularityCutoff: cutoff },
      );
      qb.addSelect(
        `COALESCE(SUM(CASE popularityEvent."eventType" ${weightCase} ELSE 0 END), 0)`,
        "popularity_score",
      );
      qb.groupBy("sealedProduct.id")
        .addGroupBy("pokemonSet.id")
        .addGroupBy("serie.id")
        .addGroupBy("locales.sealed_product_id")
        .addGroupBy("locales.locale");
    }

    const needsListingJoin =
      typeof filter.priceMin === "number" ||
      typeof filter.priceMax === "number" ||
      filter.sortBy === SealedSortBy.PRICE_ASC ||
      filter.sortBy === SealedSortBy.PRICE_DESC;

    if (needsListingJoin) {
      qb.leftJoin(
        "listing",
        "listingJoin",
        'listingJoin.sealed_product_id = sealedProduct.id AND (listingJoin."expiresAt" IS NULL OR listingJoin."expiresAt" > NOW()) AND listingJoin."quantityAvailable" > 0',
      );
      qb.addSelect("MIN(listingJoin.price)", "min_price");
      qb.groupBy("sealedProduct.id")
        .addGroupBy("pokemonSet.id")
        .addGroupBy("serie.id")
        .addGroupBy("locales.sealed_product_id")
        .addGroupBy("locales.locale");

      if (typeof filter.priceMin === "number") {
        qb.having(
          "MIN(listingJoin.price) >= :priceMin OR COUNT(listingJoin.id) = 0",
          { priceMin: filter.priceMin },
        );
      }
      if (typeof filter.priceMax === "number") {
        const clause =
          "MIN(listingJoin.price) <= :priceMax AND COUNT(listingJoin.id) > 0";
        if (typeof filter.priceMin === "number") {
          qb.andHaving(clause, { priceMax: filter.priceMax });
        } else {
          qb.having(clause, { priceMax: filter.priceMax });
        }
      }
    }

    return qb;
  }

  /**
   * Resolves a SealedSortBy enum value to sort field and direction parameters.
   */
  private resolveSort(sortBy?: SealedSortBy): {
    sort: string;
    order: "ASC" | "DESC";
  } {
    switch (sortBy) {
      case SealedSortBy.RECENT:
        return { sort: "sealedProduct.createdAt", order: "DESC" };
      case SealedSortBy.PRICE_ASC:
        return { sort: "min_price", order: "ASC" };
      case SealedSortBy.PRICE_DESC:
        return { sort: "min_price", order: "DESC" };
      case SealedSortBy.POPULARITY:
        return { sort: "popularity_score", order: "DESC" };
      case SealedSortBy.NAME:
      default:
        return { sort: "localized_name", order: "ASC" };
    }
  }

  /**
   * Returns top sealed products ordered by aggregated event popularity scores.
   *
   * @param limit Maximum products to return.
   * @returns Array of popular sealed products.
   */
  async findPopular(limit = 8): Promise<SealedProduct[]> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - POPULARITY_WINDOW_DAYS);

    const raw = await this.sealedEventRepository
      .createQueryBuilder("event")
      .select("event.sealed_product_id", "sealedProductId")
      .addSelect("event.eventType", "eventType")
      .addSelect("COUNT(*)", "count")
      .where("event.createdAt >= :cutoff", { cutoff })
      .groupBy("event.sealed_product_id")
      .addGroupBy("event.eventType")
      .getRawMany<{
        sealedProductId: string;
        eventType: SealedEventType;
        count: string;
      }>();

    const scoreById = new Map<string, number>();
    for (const row of raw) {
      const weight = SEALED_EVENT_WEIGHTS[row.eventType] || 0;
      scoreById.set(
        row.sealedProductId,
        (scoreById.get(row.sealedProductId) || 0) +
          weight * parseInt(row.count, 10),
      );
    }

    const topIds = Array.from(scoreById.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, safeLimit)
      .map(([id]) => id);

    if (topIds.length === 0) {
      // Fallback to most recent products if no event data exists
      return this.findRecent(safeLimit);
    }

    const products = await this.sealedProductRepository.find({
      where: topIds.map((id) => ({ id })),
      relations: ["pokemonSet", "locales"],
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return topIds
      .map((id) => byId.get(id))
      .filter((p): p is SealedProduct => !!p);
  }

  private async findOneOrFail(
    id: string,
    repo: Repository<SealedProduct> = this.sealedProductRepository,
  ): Promise<SealedProduct> {
    const product = await repo.findOne({
      where: { id },
      relations: ["pokemonSet", "pokemonSet.serie", "locales"],
    });
    if (!product) {
      throw new NotFoundException(`SealedProduct ${id} not found`);
    }
    return product;
  }

  /**
   * Seeds sealed products from `data/<locale>/sealed-products.json`.
   *
   * The default locale carries the whole catalog; the other locales only hold
   * the products whose name could be composed, so a missing entry leaves the
   * product with a single translation rather than an approximate one.
   *
   * Idempotent: a second run updates in place and creates no duplicate.
   *
   * @returns Report summarizing seed results.
   * @throws NotFoundException If the default locale dataset is missing.
   */
  async seedFromJson(): Promise<SealedSeedReport> {
    const byLocale = new Map<SupportedLocale, DatasetSealedProduct[]>();
    for (const locale of SUPPORTED_LOCALES) {
      byLocale.set(locale, readSealedProducts(locale));
    }

    const records = byLocale.get(DEFAULT_LOCALE) ?? [];
    if (records.length === 0) {
      throw new NotFoundException(
        `No sealed product found in ${sealedProductsFile(DEFAULT_LOCALE)}. ` +
          "Run `npm run update-sealed` in apps/fetch first.",
      );
    }

    const namesByProduct = new Map<string, Map<string, string>>();
    for (const [locale, products] of byLocale) {
      for (const product of products) {
        const names = namesByProduct.get(product.id) ?? new Map();
        names.set(locale, product.name);
        namesByProduct.set(product.id, names);
      }
    }

    const sets = await this.resolveSets(records);

    const report: SealedSeedReport = {
      totalRecords: records.length,
      inserted: 0,
      updated: 0,
      matchedSets: 0,
      unmatchedSetNames: [],
      translations: Object.fromEntries(
        [...byLocale].map(([locale, products]) => [locale, products.length]),
      ),
    };
    const unmatchedSet = new Set<string>();

    await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(SealedProduct);
      const localeRepo = manager.getRepository(SealedProductLocale);

      for (const record of records) {
        const matchedSet = record.setId ? sets.get(record.setId) : undefined;
        if (matchedSet) {
          report.matchedSets++;
        } else {
          unmatchedSet.add(record.setName ?? record.pokecardexSeriesId);
        }

        const productType = this.coerceProductType(record.productType);
        const existing = await productRepo.findOne({
          where: { id: record.id },
        });

        if (existing) {
          existing.productType = productType;
          existing.image = record.image;
          existing.pokemonSet = matchedSet ?? null;
          await productRepo.save(existing);
          report.updated++;
        } else {
          const product = productRepo.create({
            id: record.id,
            productType,
            image: record.image,
            pokemonSet: matchedSet ?? null,
          });
          await productRepo.save(product);
          report.inserted++;
        }

        const names = namesByProduct.get(record.id) ?? new Map();
        await localeRepo.upsert(
          [...names].map(([locale, name]) => ({
            sealedProductId: record.id,
            locale,
            name,
          })),
          ["sealedProductId", "locale"],
        );
      }
    });

    report.unmatchedSetNames = Array.from(unmatchedSet).sort();
    return report;
  }

  /**
   * Indexes the sets referenced by the dataset, by TCGdex identifier.
   *
   * The dataset resolves the set itself, so matching no longer goes through
   * the set label — Pokécardex and TCGdex name their sets differently, and
   * that mismatch used to leave a third of the products setless.
   */
  private async resolveSets(
    records: DatasetSealedProduct[],
  ): Promise<Map<string, PokemonSet>> {
    const ids = [
      ...new Set(
        records
          .map((record) => record.setId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) return new Map();

    const sets = await this.pokemonSetRepository.find({
      where: { id: In(ids) },
    });
    return new Map(sets.map((set) => [set.id, set]));
  }

  private coerceProductType(raw: string): SealedProductType {
    const normalized = raw.toLowerCase();
    const values = Object.values(SealedProductType) as string[];
    if (values.includes(normalized)) {
      return normalized as SealedProductType;
    }
    return SealedProductType.OTHER;
  }
}
