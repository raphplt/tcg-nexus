import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import TCGdex from "@tcgdex/sdk";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import { CardGame } from "src/common/enums/cardGame";
import { EnergyType } from "src/common/enums/energyType";
import { PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { TrainerType } from "src/common/enums/trainerType";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";

@Injectable()
export class CardSyncService {
  private readonly logger = new Logger(CardSyncService.name);
  private readonly tcgdex: TCGdex;
  private isSyncing = false;

  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly pokemonCardDetailsRepository: Repository<PokemonCardDetails>,
  ) {
    this.tcgdex = new TCGdex("fr");
  }

  private cleanString(str?: string): string {
    if (!str) return "";
    return str.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  }

  private normalizeForMapping(value?: string): string {
    if (!value) return "";
    return value
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .toLowerCase()
      .trim();
  }

  private mapPokemonCategory(value?: string): PokemonCardsType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "pokemon":
        return PokemonCardsType.Pokemon;
      case "energie":
      case "energy":
        return PokemonCardsType.Energy;
      case "dresseur":
      case "trainer":
        return PokemonCardsType.Trainer;
      default:
        return undefined;
    }
  }

  private mapTrainerType(value?: string): TrainerType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "supporter":
        return TrainerType.Supporter;
      case "objet":
      case "item":
        return TrainerType.Item;
      case "stade":
      case "stadium":
        return TrainerType.Stadium;
      case "outil":
      case "tool":
        return TrainerType.Tool;
      case "machine technique":
      case "technical machine":
        return TrainerType.TechnicalMachine;
      default:
        return undefined;
    }
  }

  private mapEnergyType(value?: string): EnergyType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "de base":
      case "basic":
        return EnergyType.Basic;
      case "special":
      case "speciale":
      case "speciales":
      case "special energy":
      case "speciale energie":
      case "specialeenergie":
        return EnergyType.Special;
      default:
        return undefined;
    }
  }

  /**
   * Tâche planifiée automatique (Tous les jours à 4h00 du matin)
   */
  @Cron("0 4 * * *")
  async handleCron() {
    this.logger.log("Déclenchement de la synchronisation automatique des cartes Pokémon...");
    try {
      const stats = await this.syncAll();
      this.logger.log(
        `Fin de la synchronisation automatique. Séries insérées: ${stats.seriesInserted}, Sets insérés: ${stats.setsInserted}, Cartes synchronisées: ${stats.cardsSynced}`,
      );
    } catch (err) {
      this.logger.error(
        `Échec de la synchronisation automatique : ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Méthode principale de synchronisation
   */
  async syncAll(): Promise<{
    seriesInserted: number;
    setsInserted: number;
    cardsSynced: number;
  }> {
    if (this.isSyncing) {
      throw new ConflictException("Une synchronisation est déjà en cours.");
    }

    this.isSyncing = true;
    let seriesInserted = 0;
    let setsInserted = 0;
    let cardsSynced = 0;

    try {
      this.logger.log("Récupération des séries et sets distants depuis TCGdex...");
      const remoteSeries = await this.tcgdex.fetch("series");
      const remoteSets = await this.tcgdex.fetch("sets");

      if (!remoteSeries || !remoteSets) {
        throw new Error("Impossible de récupérer les listes distantes de TCGdex.");
      }

      // 1. Ingestion/Mise à jour des Séries
      // On filtre "pocket" pour rester aligné avec le microservice fetch
      const pocketSeriesIds = new Set(
        remoteSeries
          .filter((s: any) => s.name.toLowerCase().includes("pocket"))
          .map((s: any) => s.id),
      );

      for (const serie of remoteSeries) {
        if (pocketSeriesIds.has(serie.id)) continue;

        let dbSerie = await this.pokemonSerieRepository.findOne({
          where: { id: serie.id },
        });

        if (!dbSerie) {
          this.logger.log("Nouvelle série détectée : " + serie.name + " (" + serie.id + ")");
          const details: any = await this.tcgdex.fetch("series", serie.id);
          if (details) {
            dbSerie = this.pokemonSerieRepository.create({
              id: details.id,
              name: details.name,
              logo: details.logo,
              game: CardGame.Pokemon,
            });
            await this.pokemonSerieRepository.save(dbSerie);
            seriesInserted++;
          }
        }
      }

      // 2. Ingestion/Mise à jour des Sets et Cartes associées
      const knownPocketSetIds = ["A1", "A1a", "A2", "A2a", "A2b", "P-A", "A3", "A3a", "A3b", "A4", "A4a", "B1a", "B2"];

      for (const setRef of remoteSets) {
        const isPocketName = setRef.name.toLowerCase().includes("pocket");
        const isKnownPocketId = knownPocketSetIds.includes(setRef.id);

        if (isPocketName || isKnownPocketId) continue;

        let dbSet = await this.pokemonSetRepository.findOne({
          where: { id: setRef.id },
          relations: ["serie"],
        });

        const setDetails: any = await this.tcgdex.fetch("sets", setRef.id);
        if (!setDetails) continue;

        const actualSerieId = setDetails.serie?.id || setDetails.serie;
        const isPocketSerie = pocketSeriesIds.has(actualSerieId);
        if (isPocketSerie) continue;

        if (!dbSet) {
          this.logger.log("Nouveau set détecté : " + setRef.name + " (" + setRef.id + ")");
          
          const serie = await this.pokemonSerieRepository.findOne({
            where: { id: String(actualSerieId) },
          });

          if (!serie) {
            this.logger.warn(
              `Série ${actualSerieId} introuvable pour le set ${setRef.name}. Set ignoré pour le moment.`,
            );
            continue;
          }

          dbSet = this.pokemonSetRepository.create({
            id: setDetails.id,
            name: setDetails.name,
            logo: setDetails.logo,
            symbol: setDetails.symbol,
            cardCount: {
              total: setDetails.cardCount?.total ?? 0,
              official: setDetails.cardCount?.official ?? 0,
              reverse: setDetails.cardCount?.reverse ?? 0,
              holo: setDetails.cardCount?.holo ?? 0,
              firstEd: setDetails.cardCount?.firstEd ?? 0,
            },
            releaseDate: setDetails.releaseDate,
            legal: {
              standard: setDetails.legal?.standard ?? false,
              expanded: setDetails.legal?.expanded ?? false,
            },
            game: CardGame.Pokemon,
            serie,
          });
          dbSet = await this.pokemonSetRepository.save(dbSet);
          setsInserted++;
        }

        // 3. Synchronisation des cartes pour ce set
        // Si le nombre de cartes en base est inférieur au total attendu du set, on synchronise
        const dbCardsCount = await this.pokemonCardRepository.count({
          where: { set: { id: dbSet.id } },
        });

        if (setDetails.cards && dbCardsCount < (setDetails.cardCount?.total ?? 0)) {
          this.logger.log(
            `Synchronisation des cartes pour le set : ${dbSet.name} (${dbCardsCount}/${setDetails.cardCount?.total} cartes en base)`,
          );

          for (const cardRef of setDetails.cards) {
            let card = await this.pokemonCardRepository.findOne({
              where: { tcgDexId: cardRef.id },
              relations: ["pokemonDetails"],
            });

            if (!card) {
              try {
                const cardDetails: any = await this.tcgdex.fetch("cards", cardRef.id);
                if (cardDetails) {
                  const name = this.cleanString(cardDetails.name);
                  const illustrator = this.cleanString(cardDetails.illustrator);
                  const description = this.cleanString(cardDetails.description);
                  const evolveFrom = this.cleanString(cardDetails.evolveFrom);
                  const effect = this.cleanString(cardDetails.effect);

                  card = this.pokemonCardRepository.create({
                    game: CardGame.Pokemon,
                    tcgDexId: cardDetails.id,
                    localId: cardDetails.localId,
                    name,
                    image: cardDetails.image,
                    category: cardDetails.category,
                    illustrator,
                    rarity: cardDetails.rarity,
                    variants: cardDetails.variants as any,
                    variantsDetailed: (cardDetails.variants_detailed || cardDetails.variantsDetailed) as any,
                    legal: cardDetails.legal,
                    updated: cardDetails.updated,
                    pricing: cardDetails.pricing,
                    set: dbSet,
                  });

                  const details = this.pokemonCardDetailsRepository.create({
                    category: this.mapPokemonCategory(cardDetails.category),
                    dexId: cardDetails.dexId,
                    hp: cardDetails.hp ? Number(cardDetails.hp) : undefined,
                    types: cardDetails.types,
                    evolveFrom,
                    description,
                    effect,
                    level: cardDetails.level ? String(cardDetails.level) : undefined,
                    stage: cardDetails.stage,
                    suffix: cardDetails.suffix,
                    item: cardDetails.item,
                    abilities: cardDetails.abilities,
                    attacks: cardDetails.attacks,
                    weaknesses: cardDetails.weaknesses,
                    resistances: cardDetails.resistances,
                    retreat: cardDetails.retreat ? Number(cardDetails.retreat) : undefined,
                    regulationMark: cardDetails.regulationMark,
                    trainerType: this.mapTrainerType(cardDetails.trainerType),
                    energyType: this.mapEnergyType(cardDetails.energyType),
                    boosters: cardDetails.boosters,
                  });

                  details.card = card;
                  card.pokemonDetails = details;
                  await this.pokemonCardRepository.save(card);
                  cardsSynced++;
                }
              } catch (cardErr) {
                this.logger.error(
                  `Erreur lors de la récupération de la carte ${cardRef.id} : ${(cardErr as Error).message}`,
                );
              }
              // Petit délai d'attente pour ménager l'API
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return {
      seriesInserted,
      setsInserted,
      cardsSynced,
    };
  }
}
