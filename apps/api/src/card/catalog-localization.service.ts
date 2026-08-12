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

/**
 * Column carrying the translated entity's identifier. Every translation table
 * is keyed by (entity, locale), so a single loader serves them all.
 */
type TranslationIdColumn = "cardId" | "setId" | "serieId" | "sealedProductId";

/**
 * Entities found in a payload, grouped by kind then by identifier. The same
 * entity often appears several times in one response — a series shared by every
 * set of a list, a card listed by several sellers — and each occurrence is a
 * distinct object that must be localized.
 */
type EntityKind = "cards" | "sets" | "series" | "sealedProducts";

type CollectedEntities = Record<EntityKind, Map<string, Localizable[]>>;

/**
 * Class names of the catalog entities. TypeORM hands back real class instances,
 * which identifies them with certainty — down to a series loaded with nothing
 * but its identifier, which no heuristic could tell from any other object.
 */
const ENTITY_CLASS_KINDS: Record<string, EntityKind> = {
  Card: "cards",
  PokemonSet: "sets",
  PokemonSerie: "series",
  SealedProduct: "sealedProducts",
};

function isObject(value: unknown): value is Localizable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Localizable).id === "string"
  );
}

/** Entity kind of a class instance, or `undefined` for a plain object. */
function classKind(value: Localizable): EntityKind | undefined {
  const name = (value as object).constructor?.name;
  return name ? ENTITY_CLASS_KINDS[name] : undefined;
}

/** Card entities uniquely feature a `tcgDexId` property. */
function isCardLike(value: Localizable): boolean {
  return typeof value.tcgDexId === "string";
}

/** Sealed products uniquely feature a `productType`. */
function isSealedProductLike(value: Localizable): boolean {
  return typeof value.productType === "string";
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
 * Entity kind of a plain object — a trimmed DTO built by a service, which has
 * lost its class and can only be recognized by its shape or by the key it hangs
 * from. Checked against the database afterwards, so a wrong guess simply finds
 * no translation.
 */
function plainObjectKind(
  value: Localizable,
  parentKey?: string,
): EntityKind | undefined {
  if (isCardLike(value)) return "cards";
  if (isSealedProductLike(value)) return "sealedProducts";
  if (isSerieLike(value, parentKey)) return "series";
  if (isSetLike(value, parentKey)) return "sets";
  return undefined;
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
      this.load(
        this.sealedProductLocales,
        "sealedProductId",
        [...sealedProducts.keys()],
        locale,
      ),
    ]);

    if (options.withTranslations) {
      await this.attachAllTranslations(collected);
    }

    for (const [id, instances] of cards) {
      const translation = cardRows.get(id);
      if (!translation) continue;
      for (const card of instances) this.applyCard(card, translation);
    }
    for (const [id, instances] of sets) {
      const translation = setRows.get(id);
      if (!translation) continue;
      for (const set of instances) {
        assign(set, "name", translation.name);
        assign(set, "logo", translation.logo);
        assign(set, "symbol", translation.symbol);
      }
    }
    for (const [id, instances] of series) {
      const translation = serieRows.get(id);
      if (!translation) continue;
      for (const serie of instances) {
        assign(serie, "name", translation.name);
        assign(serie, "logo", translation.logo);
      }
    }
    for (const [id, instances] of sealedProducts) {
      const name = sealedRows.get(id)?.name;
      for (const product of instances) assign(product, "name", name);
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
   * Loads the translation to apply per entity. The requested language wins, but
   * each field it leaves empty is filled from the next language available.
   *
   * The fallback is per field, not per row: TCGdex illustrates many old sets in
   * English only, so a French card can carry its name and lack its artwork. A
   * French label with an English artwork beats a card with no artwork at all.
   */
  private async load<T extends { locale: string }>(
    repository: Repository<T>,
    idColumn: TranslationIdColumn,
    ids: string[],
    locale: SupportedLocale,
  ): Promise<Map<string, T>> {
    if (ids.length === 0) return new Map();

    // Every locale is loaded, not just the requested one and the default: some
    // sets only exist in English, and their cards would otherwise come back
    // with no label at all now that entities carry none.
    const rows = await repository.find({
      where: { [idColumn]: In(ids) } as never,
    });

    const rowsById = new Map<string, T[]>();
    for (const row of rows) {
      const id = (row as unknown as Record<string, string>)[idColumn] as string;
      const group = rowsById.get(id);
      if (group) group.push(row);
      else rowsById.set(id, [row]);
    }

    const byId = new Map<string, T>();
    for (const [id, group] of rowsById) {
      group.sort(
        (a, b) => localeRank(a.locale, locale) - localeRank(b.locale, locale),
      );
      byId.set(id, mergeTranslations(group));
    }

    return byId;
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
      this.attachFor(
        this.sealedProductLocales,
        "sealedProductId",
        collected.sealedProducts,
      ),
    ]);
  }

  private async attachFor<T extends { locale: string }>(
    repository: Repository<T>,
    idColumn: TranslationIdColumn,
    entities: Map<string, Localizable[]>,
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

    for (const [id, instances] of entities) {
      const translations = byId.get(id) ?? {};
      for (const entity of instances) entity.translations = translations;
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

  /** Catalog entities found in the payload, grouped by identifier. */
  private collect(payload: unknown): CollectedEntities {
    const collected: CollectedEntities = {
      cards: new Map(),
      sets: new Map(),
      series: new Map(),
      sealedProducts: new Map(),
    };
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
        const kind = classKind(value) ?? plainObjectKind(value, parentKey);
        if (kind) {
          const instances = collected[kind].get(value.id);
          if (instances) instances.push(value);
          else collected[kind].set(value.id, [value]);
        }
      }

      for (const [key, nested] of Object.entries(value)) {
        walk(nested, depth + 1, key);
      }
    };

    walk(payload, 0);
    return collected;
  }
}

/**
 * Preference order for a translation row: the requested locale first, then the
 * default locale, then anything else. The last tier matters for entities that
 * only exist in one language — English-only sets, for instance.
 */
function localeRank(rowLocale: string, requested: SupportedLocale): number {
  if (rowLocale === requested) return 0;
  if (rowLocale === DEFAULT_LOCALE) return 1;
  return 2;
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && value !== null) target[key] = value;
}

/**
 * Merges translation rows already sorted by preference: the first one provides
 * the values, the following ones only fill the gaps it leaves.
 */
function mergeTranslations<T extends { locale: string }>(rows: T[]): T {
  const [preferred, ...fallbacks] = rows;
  if (fallbacks.length === 0) return preferred;

  const merged = { ...preferred } as Record<string, unknown>;
  for (const row of fallbacks) {
    for (const [key, value] of Object.entries(row)) {
      // `locale` stays that of the preferred row: it says which language the
      // entity is displayed in, not where each field came from.
      if (key !== "locale" && merged[key] == null) assign(merged, key, value);
    }
  }

  return merged as T;
}
