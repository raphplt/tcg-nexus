import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "src/translation/supported-locales";
import { In, Repository } from "typeorm";
import { CardTranslation } from "./entities/card-translation.entity";

/** Response payload object bearing an identifier: card, set, or series. */
interface Localizable {
  id: string;
  [key: string]: unknown;
}

/** Maximum payload traversal depth guard against circular references. */
const MAX_DEPTH = 8;

function isObject(value: unknown): value is Localizable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Localizable).id === "string"
  );
}

/** Card entities uniquely feature a tcgDexId property. */
function isCardLike(value: Localizable): boolean {
  return typeof value.tcgDexId === "string";
}

/** Set entities feature releaseDate, symbol, or cardCount. */
function isSetLike(value: Localizable, parentKey?: string): boolean {
  return (
    parentKey === "set" ||
    typeof value.releaseDate === "string" ||
    typeof value.symbol === "string" ||
    (typeof value.cardCount === "object" && value.cardCount !== null)
  );
}

/** Series entities feature a position or nested sets array. */
function isSerieLike(value: Localizable, parentKey?: string): boolean {
  return parentKey === "serie" || Array.isArray(value.sets);
}

/**
 * Localizes catalog entities (cards, sets, series) present in API response payloads.
 *
 * Resolves localized fields (`name`, `image`, `logo`, etc.) using order:
 * Requested Locale -> Default Fallback Locale -> Base Entity Values.
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
  ) {}

  /**
   * Traverses a payload and localizes cards, sets, and series in place.
   * Uses at most three database queries regardless of payload nesting.
   *
   * @param payload Target object or array payload.
   * @param locale Requested target locale.
   * @param options Localization options including `withTranslations`.
   * @returns Localized payload.
   */
  async localize<T>(
    payload: T,
    locale: SupportedLocale,
    options: { withTranslations?: boolean } = {},
  ): Promise<T> {
    const { cards, sets, series } = this.collect(payload);
    if (cards.size === 0 && sets.size === 0 && series.size === 0) {
      return payload;
    }

    const [cardRows, setRows, serieRows] = await Promise.all([
      this.load(this.cardTranslations, "cardId", [...cards.keys()], locale),
      this.load(this.setTranslations, "setId", [...sets.keys()], locale),
      this.load(this.serieTranslations, "serieId", [...series.keys()], locale),
    ]);

    if (options.withTranslations) {
      await this.attachAllTranslations({ cards, sets, series });
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

    return payload;
  }

  /**
   * Résout les libellés pour un usage interne au serveur — DTO allégé,
   * comparaison de noms, message de journal — là où aucune langue de requête
   * n'est à honorer.
   *
   * À appeler avant toute lecture de `name`, `image` ou `rarity` sur une carte
   * fraîchement chargée : ces champs ne vivent plus que dans les traductions.
   */
  async resolveLabels<T>(payload: T): Promise<T> {
    return this.localize(payload, DEFAULT_LOCALE);
  }

  /**
   * Loads translations to apply per entity: requested locale or fallback locale.
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
      // Requested locale always takes priority over fallback locale
      if (!current || row.locale === locale) byId.set(id, row);
    }

    return byId;
  }

  /**
   * Attaches all available translations under `translations`, indexed by locale.
   */
  private async attachAllTranslations(collected: {
    cards: Map<string, Localizable>;
    sets: Map<string, Localizable>;
    series: Map<string, Localizable>;
  }) {
    await Promise.all([
      this.attachFor(this.cardTranslations, "cardId", collected.cards),
      this.attachFor(this.setTranslations, "setId", collected.sets),
      this.attachFor(this.serieTranslations, "serieId", collected.series),
    ]);
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
   * Overwrites localized card fields. Missing translation fields are left unchanged.
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

  /** Collects catalog entities from payload deduplicated by ID. */
  private collect(payload: unknown) {
    const cards = new Map<string, Localizable>();
    const sets = new Map<string, Localizable>();
    const series = new Map<string, Localizable>();
    const seen = new Set<unknown>();

    const walk = (value: unknown, depth: number, parentKey?: string) => {
      if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
        return;
      }
      if (seen.has(value)) return;
      seen.add(value);

      if (Array.isArray(value)) {
        for (const item of value) walk(item, depth + 1, parentKey);
        return;
      }

      if (isObject(value)) {
        if (isCardLike(value)) cards.set(value.id, value);
        else if (isSerieLike(value, parentKey)) series.set(value.id, value);
        else if (isSetLike(value, parentKey)) sets.set(value.id, value);
      }

      for (const [key, nested] of Object.entries(value)) {
        walk(nested, depth + 1, key);
      }
    };

    walk(payload, 0);
    return { cards, sets, series };
  }
}

function assign(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && value !== null) target[key] = value;
}
