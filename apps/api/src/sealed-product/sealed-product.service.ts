import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as fs from "fs";
import * as path from "path";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { DataSource, Repository } from "typeorm";
import { PaginatedResult, PaginationHelper } from "../helpers/pagination";
import { CreateSealedProductDto } from "./dto/create-sealed-product.dto";
import { SealedProductFilterDto } from "./dto/sealed-product-filter.dto";
import { UpdateSealedProductDto } from "./dto/update-sealed-product.dto";
import {
  SealedProduct,
  SealedProductContents,
} from "./entities/sealed-product.entity";
import { SealedProductLocale } from "./entities/sealed-product-locale.entity";
import { SealedProductType } from "./enums/sealed-product-type.enum";

interface SealedProductSeedRecord {
  id: string;
  pokecardexSeriesId: string;
  setName: string;
  name: string;
  productType: string;
  image: string;
  imageFilename: string;
}

export interface SealedSeedReport {
  totalRecords: number;
  inserted: number;
  updated: number;
  matchedSets: number;
  unmatchedSetNames: string[];
}

@Injectable()
export class SealedProductService {
  constructor(
    @InjectRepository(SealedProduct)
    private readonly sealedProductRepository: Repository<SealedProduct>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSealedProductDto): Promise<SealedProduct> {
    return this.dataSource.transaction(async (manager) => {
      const product = manager.create(SealedProduct, {
        id: dto.id,
        nameEn: dto.nameEn,
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

      if (dto.locales?.length) {
        const locales = dto.locales.map((l) =>
          manager.create(SealedProductLocale, {
            sealedProduct: product,
            locale: l.locale,
            name: l.name,
          }),
        );
        await manager.save(locales);
      }

      return this.findOneOrFail(dto.id, manager.getRepository(SealedProduct));
    });
  }

  async findAll(filter: SealedProductFilterDto = {}): Promise<SealedProduct[]> {
    const qb = this.buildFilteredQuery(filter);
    return qb.getMany();
  }

  async findAllPaginated(
    filter: SealedProductFilterDto = {},
  ): Promise<PaginatedResult<SealedProduct>> {
    const qb = this.buildFilteredQuery(filter);
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page: filter.page, limit: filter.limit },
      "sealedProduct.nameEn",
      "ASC",
    );
  }

  async findOne(id: string): Promise<SealedProduct> {
    return this.findOneOrFail(id);
  }

  async update(
    id: string,
    dto: UpdateSealedProductDto,
  ): Promise<SealedProduct> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SealedProduct);
      const existing = await this.findOneOrFail(id, repo);

      Object.assign(existing, {
        nameEn: dto.nameEn ?? existing.nameEn,
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
        await manager.delete(SealedProductLocale, { sealedProduct: { id } });
        if (dto.locales.length) {
          const locales = dto.locales.map((l) =>
            manager.create(SealedProductLocale, {
              sealedProduct: existing,
              locale: l.locale,
              name: l.name,
            }),
          );
          await manager.save(locales);
        }
      }

      return this.findOneOrFail(id, repo);
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.sealedProductRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`SealedProduct ${id} not found`);
    }
  }

  private buildFilteredQuery(filter: SealedProductFilterDto) {
    const qb = this.sealedProductRepository
      .createQueryBuilder("sealedProduct")
      .leftJoinAndSelect("sealedProduct.pokemonSet", "pokemonSet")
      .leftJoinAndSelect("sealedProduct.locales", "locales");

    if (filter.setId) {
      qb.andWhere("pokemonSet.id = :setId", { setId: filter.setId });
    }
    if (filter.productType) {
      qb.andWhere("sealedProduct.productType = :productType", {
        productType: filter.productType,
      });
    }
    if (filter.search) {
      qb.andWhere(
        "(sealedProduct.nameEn ILIKE :search OR locales.name ILIKE :search OR sealedProduct.sku ILIKE :search)",
        { search: `%${filter.search}%` },
      );
    }
    return qb;
  }

  private async findOneOrFail(
    id: string,
    repo: Repository<SealedProduct> = this.sealedProductRepository,
  ): Promise<SealedProduct> {
    const product = await repo.findOne({
      where: { id },
      relations: ["pokemonSet", "locales"],
    });
    if (!product) {
      throw new NotFoundException(`SealedProduct ${id} not found`);
    }
    return product;
  }

  /**
   * Lit `apps/data/sealed_products.json` (généré par `apps/fetch/update-sealed.ts`)
   * et upsert les produits scellés en base.
   *
   * Pour chaque enregistrement, on tente d'associer un PokemonSet par
   * matching de nom normalisé (lowercase, sans accents). Les sealed sans
   * match restent rattachés à `pokemonSet = null` et leur série pokecardex
   * est listée dans le rapport pour review manuelle.
   */
  async seedFromJson(): Promise<SealedSeedReport> {
    const dataPath = path.resolve(
      __dirname,
      "../../../../data/sealed_products.json",
    );
    if (!fs.existsSync(dataPath)) {
      throw new NotFoundException(
        `sealed_products.json not found at ${dataPath} — run \`npm run update-sealed\` in apps/fetch first.`,
      );
    }

    const records: SealedProductSeedRecord[] = JSON.parse(
      fs.readFileSync(dataPath, "utf-8"),
    );

    // Index des PokemonSet par nom normalisé pour le matching
    const allSets = await this.pokemonSetRepository.find();
    const setByNormalizedName = new Map<string, PokemonSet>();
    for (const set of allSets) {
      setByNormalizedName.set(this.normalizeName(set.name), set);
    }

    const report: SealedSeedReport = {
      totalRecords: records.length,
      inserted: 0,
      updated: 0,
      matchedSets: 0,
      unmatchedSetNames: [],
    };
    const unmatchedSet = new Set<string>();

    await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(SealedProduct);
      const localeRepo = manager.getRepository(SealedProductLocale);

      for (const record of records) {
        const matchedSet = setByNormalizedName.get(
          this.normalizeName(record.setName),
        );
        if (matchedSet) {
          report.matchedSets++;
        } else {
          unmatchedSet.add(record.setName);
        }

        const productType = this.coerceProductType(record.productType);
        const existing = await productRepo.findOne({
          where: { id: record.id },
        });

        if (existing) {
          existing.nameEn = record.name;
          existing.productType = productType;
          existing.image = record.image;
          existing.pokemonSet = matchedSet ?? null;
          await productRepo.save(existing);
          report.updated++;
        } else {
          const product = productRepo.create({
            id: record.id,
            nameEn: record.name,
            productType,
            image: record.image,
            pokemonSet: matchedSet ?? null,
          });
          await productRepo.save(product);
          report.inserted++;
        }

        // Upsert la locale FR : c'est la langue native pokecardex
        const existingLocale = await localeRepo.findOne({
          where: {
            sealedProduct: { id: record.id },
            locale: "fr",
          },
        });
        if (existingLocale) {
          existingLocale.name = record.name;
          await localeRepo.save(existingLocale);
        } else {
          const locale = localeRepo.create({
            sealedProduct: { id: record.id } as SealedProduct,
            locale: "fr",
            name: record.name,
          });
          await localeRepo.save(locale);
        }
      }
    });

    report.unmatchedSetNames = Array.from(unmatchedSet).sort();
    return report;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
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
