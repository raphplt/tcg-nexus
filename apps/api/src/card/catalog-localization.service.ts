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

/** Objet de réponse porteur d'un identifiant : carte, set ou série. */
interface Localizable {
  id: string;
  [key: string]: unknown;
}

/** Profondeur maximale de parcours d'un payload, garde-fou contre les cycles. */
const MAX_DEPTH = 8;

function isObject(value: unknown): value is Localizable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Localizable).id === "string"
  );
}

/** Une carte porte un `tcgDexId` — aucune autre entité du catalogue n'en a. */
function isCardLike(value: Localizable): boolean {
  return typeof value.tcgDexId === "string";
}

/** Un set porte un décompte de cartes, une date de sortie ou un symbole. */
function isSetLike(value: Localizable, parentKey?: string): boolean {
  return (
    parentKey === "set" ||
    typeof value.releaseDate === "string" ||
    typeof value.symbol === "string" ||
    (typeof value.cardCount === "object" && value.cardCount !== null)
  );
}

/** Une série se reconnaît à sa position, ou à la liste de sets qu'elle porte. */
function isSerieLike(value: Localizable, parentKey?: string): boolean {
  return parentKey === "serie" || Array.isArray(value.sets);
}

/**
 * Traduit les entités du catalogue présentes dans une réponse de l'API.
 *
 * Le web n'a pas à connaître l'existence des tables de traduction : il reçoit
 * une carte, un set ou une série dont `name`, `image`, `logo`… sont déjà
 * résolus. La résolution suit l'ordre : langue demandée → langue de repli →
 * valeurs portées par l'entité (héritage, donc jamais vide).
 *
 * Un seul point de passage plutôt qu'une résolution service par service : la
 * carte apparaît dans beaucoup de payloads — listings, collections, decks,
 * résultats de recherche — et chacun aurait dû penser à traduire.
 *
 * Les identifiants collectés sont confrontés à la base : un objet pris à tort
 * pour un set ne trouve aucune traduction et reste intact.
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
   * Parcourt un payload et y traduit sur place cartes, sets et séries.
   * Au plus trois requêtes, quel que soit le nombre d'entités imbriquées.
   *
   * En mode `withTranslations`, les entités reçoivent en plus un champ
   * `translations` contenant toutes les langues — vue d'administration, pour
   * comparer ou corriger les libellés.
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
   * Traductions à appliquer, une par entité : celle de la langue demandée, ou
   * celle de la langue de repli quand l'entité n'existe pas dans cette langue.
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
      // La langue demandée l'emporte toujours sur la langue de repli.
      if (!current || row.locale === locale) byId.set(id, row);
    }

    return byId;
  }

  /**
   * Attache toutes les langues sous `translations`, indexées par locale.
   * Les champs résolus restent en place : la vue d'administration montre à la
   * fois ce que voit l'utilisateur et ce qui existe dans chaque langue.
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
   * Écrase les champs linguistiques de la carte. Un champ absent de la
   * traduction est laissé tel quel plutôt que vidé.
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

  /** Entités du catalogue présentes dans le payload, dédoublonnées par id. */
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
        // Un tableau ne change pas la clé parente : `set.cards[0]` reste
        // rattaché à la clé `cards`.
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
