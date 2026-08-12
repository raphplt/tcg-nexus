import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";
import { SealedProductLocale } from "src/sealed-product/entities/sealed-product-locale.entity";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "src/translation/supported-locales";
import { In, Repository } from "typeorm";
import { CardTranslation } from "./entities/card-translation.entity";

/** Response payload object bearing an identifier: card, set, series or sealed product. */
interface Localizable {
  id: string;
  [key: string]: unknown;
}

/** Maximum payload traversal depth, guarding against circular references. */
const MAX_DEPTH = 8;

interface CollectedEntities {
  cards: Map<string, Localizable>;
  sets: Map<string, Localizable>;
  series: Map<string, Localizable>;
  sealedProducts: Map<string, Localizable>;
}

function isObject(value: unknown): value is Localizable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Localizable).id === "string"
  );
}

/** Card entities uniquely feature a `tcgDexId` property. */
function isCardLike(value: Localizable): boolean {
  return typeof value.tcgDexId === "string";
}

/** Sealed products uniquely feature `productType` or `nameEn`. */
function isSealedProductLike(value: Localizable): boolean {
  return (
    typeof value.productType === "string" || typeof value.nameEn === "string"
  );
}

/** Set entities feature a release date, a symbol, or a card count. */
function isSetLike(value: Localizable, parentKey?: string): boolean {
  return (
    parentKey === "set" ||
    typeof value.releaseDate === "string" ||
    typeof value.symbol === "string" ||
    (typeof value.cardCount === "object" && value.cardCount !== null)
  );
}

/** Series entities are identified by their position, or by a nested sets array. */
function isSerieLike(value: Localizable, parentKey?: string): boolean {
  return parentKey === "serie" || Array.isArray(value.sets);
}

/**
 * Localizes catalog entities present in API response payloads: cards, sets,
 * series and sealed products.
 *
 * Clients never deal with translation tables: they receive an entity whose
 * `name`, `image`, `logo`… are already resolved, following the order
 * requested locale -> default locale -> value already on the payload.
 *
 * A single traversal rather than per-service resolution: cards appear in many
 * payloads — listings, collections, decks, search results — and each one would
 * otherwise have to remember to localize.
 *
 * Collected identifiers are checked against the database, so an object wrongly
 * detected as a set simply finds no translation and stays untouched.
 */
@Injectable()
export class CatalogLocalizationService {
  constructor(
    @InjectRepository(CardTranslation)
    private readonly cardTranslations: Repository<CardTranslation>,
    @InjectRepository(PokemonSetTranslation)
    private readonly setTranslations: Repository<PokemonSetTranslation>,
    @InjectRepository(PokemonSerieTranslation)
    private readonly serieTranslations: Repository<PokemonSerieTranslation>,
    @InjectRepository(SealedProductLocale)
    private readonly sealedProductLocales: Repository<SealedProductLocale>,
  ) {}

  /**
   * Traverses a payload and localizes catalog entities in place.
   * Runs at most four queries, whatever the payload nesting.
   *
   * @param payload Target object or array payload.
   * @param locale Requested target locale.
   * @param options `withTranslations` also attaches every language, for admin views.
   * @returns The same payload, localized in place.
   */
  async localize<T>(
    payload: T,
    locale: SupportedLocale,
    options: { withTranslations?: boolean } = {},
  ): Promise<T> {
    const collected = this.collect(payload);
    const { cards, sets, series, sealedProducts } = collected;

    if (
      cards.size === 0 &&
      sets.size === 0 &&
      series.size === 0 &&
      sealedProducts.size === 0
    ) {
      return payload;
    }

    const [cardRows, setRows, serieRows, sealedRows] = await Promise.all([
      this.load(this.cardTranslations, "cardId", [...cards.keys()], locale),
      this.load(this.setTranslations, "setId", [...sets.keys()], locale),
      this.load(this.serieTranslations, "serieId", [...series.keys()], locale),
      this.loadSealedProductNames([...sealedProducts.keys()], locale),
    ]);

    if (options.withTranslations) {
      await this.attachAllTranslations(collected);
    }

    for (const [id, card] of cards) {
      const translation = cardRows.get(id);
      if (translation) this.applyCard(card, translation);
    }
    for (const [id, set] of sets) {
      const translation = setRows.get(id);
      if (translation) {
        assign(set, "name", translation.name);
        assign(set, "logo", translation.logo);
        assign(set, "symbol", translation.symbol);
      }
    }
    for (const [id, serie] of series) {
      const translation = serieRows.get(id);
      if (translation) {
        assign(serie, "name", translation.name);
        assign(serie, "logo", translation.logo);
      }
    }
    for (const [id, product] of sealedProducts) {
      // Falls back to `nameEn` when the product has no localized name.
      assign(product, "name", sealedRows.get(id) ?? product.nameEn);
    }

    return payload;
  }

  /**
   * Resolves labels for server-side use — trimmed DTOs, name comparisons, log
   * messages — where there is no request language to honour.
   *
   * Call it before reading `name`, `image` or `rarity` on a freshly loaded
   * card: those fields only live in translations.
   *
   * @param payload Target object or array payload.
   * @returns The same payload, resolved in the default locale.
   */
  async resolveLabels<T>(payload: T): Promise<T> {
    return this.localize(payload, DEFAULT_LOCALE);
  }

  /**
   * Loads the translation to apply per entity: the requested locale, or the
   * fallback locale when the entity has no row in that language.
   */
  private async load<T extends { locale: string }>(
    repository: Repository<T>,
    idColumn: "cardId" | "setId" | "serieId",
    ids: string[],
    locale: SupportedLocale,
  ): Promise<Map<string, T>> {
    if (ids.length === 0) return new Map();

    const locales =
      locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];

    const rows = await repository.find({
      where: { [idColumn]: In(ids), locale: In(locales) } as never,
    });

    const byId = new Map<string, T>();
    for (const row of rows) {
      const id = (row as unknown as Record<string, string>)[idColumn] as string;
      const current = byId.get(id);
      // The requested locale always wins over the fallback locale.
      if (!current || row.locale === locale) byId.set(id, row);
    }

    return byId;
  }

  /**
   * Sealed product names live in their own table, keyed by a generated id
   * rather than by the product: the product id is read from the join column.
   */
  private async loadSealedProductNames(
    ids: string[],
    locale: SupportedLocale,
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const locales =
      locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];

    const rows = await this.sealedProductLocales
      .createQueryBuilder("productLocale")
      .select("productLocale.sealed_product_id", "productId")
      .addSelect("productLocale.locale", "locale")
      .addSelect("productLocale.name", "name")
      .where("productLocale.sealed_product_id IN (:...ids)", { ids })
      .andWhere("productLocale.locale IN (:...locales)", { locales })
      .getRawMany<{ productId: string; locale: string; name: string }>();

    const byId = new Map<string, { locale: string; name: string }>();
    for (const row of rows) {
      const current = byId.get(row.productId);
      if (!current || row.locale === locale) {
        byId.set(row.productId, { locale: row.locale, name: row.name });
      }
    }

    return new Map(
      [...byId.entries()].map(([id, value]) => [id, value.name] as const),
    );
  }

  /**
   * Attaches every language under `translations`, keyed by locale. Resolved
   * fields stay in place, so an admin view shows both what users see and what
   * exists in each language.
   */
  private async attachAllTranslations(collected: CollectedEntities) {
    await Promise.all([
      this.attachFor(this.cardTranslations, "cardId", collected.cards),
      this.attachFor(this.setTranslations, "setId", collected.sets),
      this.attachFor(this.serieTranslations, "serieId", collected.series),
      this.attachSealedProductTranslations(collected.sealedProducts),
    ]);
  }

  /**
   * Sealed product translations live in their own table, keyed by a generated
   * id, so they cannot go through the generic `attachFor`.
   */
  private async attachSealedProductTranslations(
    entities: Map<string, Localizable>,
  ) {
    if (entities.size === 0) return;

    const rows = await this.sealedProductLocales
      .createQueryBuilder("productLocale")
      .select("productLocale.sealed_product_id", "productId")
      .addSelect("productLocale.locale", "locale")
      .addSelect("productLocale.name", "name")
      .where("productLocale.sealed_product_id IN (:...ids)", {
        ids: [...entities.keys()],
      })
      .getRawMany<{ productId: string; locale: string; name: string }>();

    const byId = new Map<string, Record<string, { name: string }>>();
    for (const row of rows) {
      const entry = byId.get(row.productId) ?? {};
      entry[row.locale] = { name: row.name };
      byId.set(row.productId, entry);
    }

    for (const [id, entity] of entities) {
      entity.translations = byId.get(id) ?? {};
    }
  }

  private async attachFor<T extends { locale: string }>(
    repository: Repository<T>,
    idColumn: "cardId" | "setId" | "serieId",
    entities: Map<string, Localizable>,
  ) {
    if (entities.size === 0) return;

    const rows = await repository.find({
      where: { [idColumn]: In([...entities.keys()]) } as never,
    });

    const byId = new Map<string, Record<string, T>>();
    for (const row of rows) {
      const id = (row as unknown as Record<string, string>)[idColumn] as string;
      const entry = byId.get(id) ?? {};
      entry[row.locale] = row;
      byId.set(id, entry);
    }

    for (const [id, entity] of entities) {
      entity.translations = byId.get(id) ?? {};
    }
  }

  /**
   * Overwrites the localized fields of a card. A field missing from the
   * translation is left as-is rather than blanked out.
   */
  private applyCard(card: Localizable, translation: CardTranslation) {
    assign(card, "name", translation.name);
    assign(card, "image", translation.image);
    assign(card, "category", translation.category);
    assign(card, "rarity", translation.rarity);

    const details = card.pokemonDetails as Record<string, unknown> | undefined;
    if (!details) return;

    assign(details, "description", translation.description);
    assign(details, "effect", translation.effect);
    assign(details, "evolveFrom", translation.evolveFrom);
    assign(details, "stage", translation.stage);
    assign(details, "suffix", translation.suffix);
    assign(details, "item", translation.item);
    assign(details, "abilities", translation.abilities);
    assign(details, "attacks", translation.attacks);
  }

  /** Catalog entities found in the payload, deduplicated by id. */
  private collect(payload: unknown): CollectedEntities {
    const cards = new Map<string, Localizable>();
    const sets = new Map<string, Localizable>();
    const series = new Map<string, Localizable>();
    const sealedProducts = new Map<string, Localizable>();
    const seen = new Set<unknown>();

    const walk = (value: unknown, depth: number, parentKey?: string) => {
      if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
        return;
      }
      if (seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        // An array does not change the parent key: `set.cards[0]` stays
        // attached to the `cards` key.
        for (const item of value) walk(item, depth + 1, parentKey);
        return;
      }

      if (isObject(value)) {
        if (isCardLike(value)) cards.set(value.id, value);
        else if (isSealedProductLike(value))
          sealedProducts.set(value.id, value);
        else if (isSerieLike(value, parentKey)) series.set(value.id, value);
        else if (isSetLike(value, parentKey)) sets.set(value.id, value);
      }

      for (const [key, nested] of Object.entries(value)) {
        walk(nested, depth + 1, key);
      }
    };

    walk(payload, 0);
    return { cards, sets, series, sealedProducts };
  }
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && value !== null) target[key] = value;
}
