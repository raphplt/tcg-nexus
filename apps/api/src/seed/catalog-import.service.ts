import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DATASET_LOCALES,
  type DatasetCard,
  type DatasetLocale,
  listSetIds,
  readSeries,
  readSetCards,
  readSets,
  resolveDataDir,
} from "@repo/pokemon-dataset";
import * as fs from "fs";
import { Card } from "src/card/entities/card.entity";
import { CardTranslation } from "src/card/entities/card-translation.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { CardGame } from "src/common/enums/cardGame";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSerieTranslation } from "src/pokemon-series/entities/pokemon-serie-translation.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { PokemonSetTranslation } from "src/pokemon-set/entities/pokemon-set-translation.entity";
import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import { DeepPartial, In, Repository } from "typeorm";
import {
  cleanString,
  mapEnergyType,
  mapPokemonCategory,
  mapTrainerType,
} from "./catalog-mapping";

export interface CatalogImportReport {
  locales: DatasetLocale[];
  series: number;
  sets: number;
  cardsCreated: number;
  cardsUpdated: number;
  /** Number of translations written, per locale. */
  translations: Record<string, number>;
}

const BATCH_SIZE = 500;

/**
 * Imports the Pokémon catalog from the dataset (`data/<locale>/`) into the
 * database.
 *
 * No locale is privileged: `card`, `pokemon_set` and `pokemon_serie` only hold
 * non-localized data, each enabled locale having its own row in the matching
 * translation table.
 *
 * The import is idempotent: entities are updated, never duplicated, and a
 * locale missing from a run never has its translations removed.
 */
@Injectable()
export class CatalogImportService {
  private readonly logger = new Logger(CatalogImportService.name);

  constructor(
    @InjectRepository(PokemonSerie)
    private readonly serieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSerieTranslation)
    private readonly serieTranslationRepository: Repository<PokemonSerieTranslation>,
    @InjectRepository(PokemonSet)
    private readonly setRepository: Repository<PokemonSet>,
    @InjectRepository(PokemonSetTranslation)
    private readonly setTranslationRepository: Repository<PokemonSetTranslation>,
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly cardDetailsRepository: Repository<PokemonCardDetails>,
    @InjectRepository(CardTranslation)
    private readonly cardTranslationRepository: Repository<CardTranslation>,
  ) {}

  /**
   * Locales to import: the requested ones, restricted to those actually
   * present in the dataset. A locale that was never scraped is skipped with a
   * warning rather than producing empty translations.
   */
  private availableLocales(requested?: DatasetLocale[]): DatasetLocale[] {
    const dataDir = resolveDataDir();
    const candidates = requested ?? [...DATASET_LOCALES];

    return candidates.filter((locale) => {
      const present = fs.existsSync(`${dataDir}/${locale}`);
      if (!present) {
        this.logger.warn(
          `Langue ${locale} absente du dataset — ignorée. ` +
            "Lancer `npm run data:pull` dans apps/fetch.",
        );
      }
      return present;
    });
  }

  /**
   * Fallback order for non-localized fields: the default locale first, so the
   * values picked stay stable from one run to the next.
   */
  private orderByFallback(locales: DatasetLocale[]): DatasetLocale[] {
    return [...locales].sort((a, b) => {
      if (a === DEFAULT_LOCALE) return -1;
      if (b === DEFAULT_LOCALE) return 1;
      return a.localeCompare(b);
    });
  }

  async importCatalog(
    requested?: DatasetLocale[],
  ): Promise<CatalogImportReport> {
    const locales = this.orderByFallback(this.availableLocales(requested));

    if (locales.length === 0) {
      throw new Error(
        "Aucune langue disponible dans le dataset. " +
          "Lancer `npm run data:pull` dans apps/fetch.",
      );
    }

    this.logger.log(`Import du catalogue — langues : ${locales.join(", ")}`);

    const series = await this.importSeries(locales);
    const sets = await this.importSets(locales);
    const cards = await this.importCards(locales);

    return { locales, series, sets, ...cards };
  }

  // --- Series ---------------------------------------------------------------

  private async importSeries(locales: DatasetLocale[]): Promise<number> {
    const byId = new Map<string, Record<DatasetLocale, unknown>>();

    for (const locale of locales) {
      for (const serie of readSeries(locale)) {
        const entry = byId.get(serie.id) ?? ({} as Record<string, unknown>);
        entry[locale] = serie;
        byId.set(serie.id, entry as Record<DatasetLocale, unknown>);
      }
    }

    const translations: DeepPartial<PokemonSerieTranslation>[] = [];

    for (const [id, perLocale] of byId) {
      const fallback = this.pickFallback(perLocale, locales) as {
        name?: string;
        logo?: string;
      };

      await this.serieRepository.upsert({ id, game: CardGame.Pokemon }, ["id"]);

      for (const locale of locales) {
        const serie = perLocale[locale] as
          | { name?: string; logo?: string }
          | undefined;
        if (!serie) continue;

        translations.push({
          serieId: id,
          locale,
          name: serie.name ? cleanString(serie.name) : undefined,
          logo: serie.logo,
        });
      }
    }

    await this.saveInBatches(this.serieTranslationRepository, translations, [
      "serieId",
      "locale",
    ]);

    this.logger.log(`${byId.size} séries importées.`);
    return byId.size;
  }

  // --- Sets -----------------------------------------------------------------

  private async importSets(locales: DatasetLocale[]): Promise<number> {
    const byId = new Map<string, Record<string, Record<string, unknown>>>();

    for (const locale of locales) {
      for (const set of readSets(locale)) {
        const entry = byId.get(set.id) ?? {};
        entry[locale] = set as Record<string, unknown>;
        byId.set(set.id, entry);
      }
    }

    const knownSerieIds = new Set(
      (await this.serieRepository.find({ select: ["id"] })).map(
        (serie) => serie.id,
      ),
    );

    const translations: DeepPartial<PokemonSetTranslation>[] = [];
    let imported = 0;

    for (const [id, perLocale] of byId) {
      const fallback = this.pickFallback(perLocale, locales);
      const serieId = (fallback.serieId ?? fallback.serie) as
        | string
        | undefined;

      if (!serieId || !knownSerieIds.has(serieId)) {
        this.logger.warn(`Set ${id} sans série connue — ignoré.`);
        continue;
      }

      await this.setRepository.upsert(
        {
          id,
          game: CardGame.Pokemon,
          serie: { id: serieId },
          cardCount: fallback.cardCount,
          releaseDate: fallback.releaseDate,
          legal: fallback.legal,
          tcgOnline: fallback.tcgOnline,
        },
        ["id"],
      );
      imported++;

      for (const locale of locales) {
        const set = perLocale[locale];
        if (!set) continue;

        translations.push({
          setId: id,
          locale,
          name: set.name ? cleanString(String(set.name)) : undefined,
          logo: set.logo as string | undefined,
          symbol: set.symbol as string | undefined,
        });
      }
    }

    await this.saveInBatches(this.setTranslationRepository, translations, [
      "setId",
      "locale",
    ]);

    this.logger.log(`${imported} sets importés.`);
    return imported;
  }

  // --- Cartes ---------------------------------------------------------------

  private async importCards(locales: DatasetLocale[]) {
    const knownSetIds = new Set(
      (await this.setRepository.find({ select: ["id"] })).map((set) => set.id),
    );

    // A set is processed as soon as at least one locale provides it
    const setIds = [
      ...new Set(locales.flatMap((locale) => listSetIds(locale))),
    ].sort();

    let cardsCreated = 0;
    let cardsUpdated = 0;
    const translationCounts: Record<string, number> = {};
    for (const locale of locales) translationCounts[locale] = 0;

    for (const setId of setIds) {
      if (!knownSetIds.has(setId)) {
        this.logger.warn(`Set ${setId} absent de la base — cartes ignorées.`);
        continue;
      }

      const perLocale = new Map<string, Record<string, DatasetCard>>();
      for (const locale of locales) {
        for (const card of readSetCards(locale, setId)) {
          const entry = perLocale.get(card.id) ?? {};
          entry[locale] = card;
          perLocale.set(card.id, entry);
        }
      }
      if (perLocale.size === 0) continue;

      const result = await this.importSetCards(setId, perLocale, locales);
      cardsCreated += result.created;
      cardsUpdated += result.updated;
      for (const locale of locales) {
        translationCounts[locale] =
          (translationCounts[locale] ?? 0) + (result.translations[locale] ?? 0);
      }
    }

    this.logger.log(
      `Cartes : ${cardsCreated} créées, ${cardsUpdated} mises à jour. ` +
        `Traductions : ${Object.entries(translationCounts)
          .map(([locale, count]) => `${locale} ${count}`)
          .join(", ")}.`,
    );

    return { cardsCreated, cardsUpdated, translations: translationCounts };
  }

  /** Importe les cartes d'un set, toutes langues confondues. */
  private async importSetCards(
    setId: string,
    perLocale: Map<string, Record<string, DatasetCard>>,
    locales: DatasetLocale[],
  ) {
    const tcgDexIds = [...perLocale.keys()];
    const existing = await this.cardRepository.find({
      where: { tcgDexId: In(tcgDexIds), game: CardGame.Pokemon },
      select: ["id", "tcgDexId"],
    });
    const idByTcgDexId = new Map(
      existing.map((card) => [card.tcgDexId as string, card.id]),
    );

    const toSave: DeepPartial<Card>[] = [];
    let created = 0;
    let updated = 0;

    for (const [tcgDexId, cards] of perLocale) {
      const fallback = this.pickFallback(cards, locales);
      const existingId = idByTcgDexId.get(tcgDexId);

      if (existingId) updated++;
      else created++;

      toSave.push({
        ...(existingId ? { id: existingId } : {}),
        game: CardGame.Pokemon,
        tcgDexId,
        localId: fallback.localId,
        set: { id: setId },
        variants: fallback.variants,
        variantsDetailed: fallback.variants_detailed,
        legal: fallback.legal,
        pricing: fallback.pricing,
        updated: fallback.updated,
        // L'illustrateur est un nom propre : il ne se traduit pas.
        illustrator: fallback.illustrator
          ? cleanString(String(fallback.illustrator))
          : null,
      } as DeepPartial<Card>);
    }

    // `save` returns entities with IDs (including inserts), allowing details/translations linkage right after
    const saved = await this.cardRepository.save(toSave, {
      chunk: BATCH_SIZE,
    });
    const savedIdByTcgDexId = new Map(
      saved.map((card) => [card.tcgDexId as string, card.id]),
    );

    await this.saveCardDetails(perLocale, savedIdByTcgDexId, locales);
    const translations = await this.saveCardTranslations(
      perLocale,
      savedIdByTcgDexId,
      locales,
    );

    return { created, updated, translations };
  }

  /** Champs de jeu, identiques dans toutes les langues. */
  private async saveCardDetails(
    perLocale: Map<string, Record<string, DatasetCard>>,
    idByTcgDexId: Map<string, string>,
    locales: DatasetLocale[],
  ) {
    const rows: DeepPartial<PokemonCardDetails>[] = [];

    for (const [tcgDexId, cards] of perLocale) {
      const cardId = idByTcgDexId.get(tcgDexId);
      if (!cardId) continue;

      const fallback = this.pickFallback(cards, locales);

      rows.push({
        cardId,
        category: mapPokemonCategory(fallback.category as string),
        dexId: fallback.dexId,
        hp: fallback.hp,
        types: fallback.types,
        level: fallback.level,
        weaknesses: fallback.weaknesses,
        resistances: fallback.resistances,
        retreat: fallback.retreat,
        regulationMark: fallback.regulationMark,
        trainerType: mapTrainerType(fallback.trainerType as string),
        energyType: mapEnergyType(fallback.energyType as string),
        boosters: fallback.boosters,
      } as DeepPartial<PokemonCardDetails>);
    }

    await this.saveInBatches(this.cardDetailsRepository, rows, ["cardId"]);
  }

  private async saveCardTranslations(
    perLocale: Map<string, Record<string, DatasetCard>>,
    idByTcgDexId: Map<string, string>,
    locales: DatasetLocale[],
  ): Promise<Record<string, number>> {
    const rows: DeepPartial<CardTranslation>[] = [];
    const counts: Record<string, number> = {};

    for (const [tcgDexId, cards] of perLocale) {
      const cardId = idByTcgDexId.get(tcgDexId);
      if (!cardId) continue;

      for (const locale of locales) {
        const card = cards[locale];
        if (!card) continue;

        rows.push({
          cardId,
          locale,
          name: card.name ? cleanString(card.name) : undefined,
          image: card.image,
          category: card.category,
          rarity: card.rarity,
          description: card.description
            ? cleanString(String(card.description))
            : undefined,
          effect: card.effect ? cleanString(String(card.effect)) : undefined,
          evolveFrom: card.evolveFrom
            ? cleanString(String(card.evolveFrom))
            : undefined,
          stage: card.stage as string | undefined,
          suffix: card.suffix as string | undefined,
          item: card.item as { name: string; effect: string } | undefined,
          abilities: card.abilities as CardTranslation["abilities"],
          attacks: card.attacks as CardTranslation["attacks"],
          sourceUpdatedAt: card.updated as string | undefined,
        });
        counts[locale] = (counts[locale] ?? 0) + 1;
      }
    }

    await this.saveInBatches(this.cardTranslationRepository, rows, [
      "cardId",
      "locale",
    ]);

    return counts;
  }

  // --- Utilitaires ----------------------------------------------------------

  /**
   * First locale available for this entity, in fallback order.
   * Non-localized fields (hp, types, pricing…) are identical across locales,
   * so any of them will do.
   */
  private pickFallback<T>(
    perLocale: Record<string, T>,
    locales: DatasetLocale[],
  ): T & Record<string, any> {
    for (const locale of locales) {
      const value = perLocale[locale];
      if (value) return value as T & Record<string, any>;
    }
    // `perLocale` map is non-empty: constructed from parsed dataset languages
    return Object.values(perLocale)[0] as T & Record<string, any>;
  }

  /**
   * Batch upsert. Existing translations are updated without deletion:
   * locales absent from a run retain previous values.
   */
  private async saveInBatches<T extends object>(
    repository: Repository<T>,
    rows: DeepPartial<T>[],
    conflictPaths: string[],
  ) {
    for (let index = 0; index < rows.length; index += BATCH_SIZE) {
      await repository.upsert(
        rows.slice(index, index + BATCH_SIZE) as never,
        conflictPaths,
      );
    }
  }
}
