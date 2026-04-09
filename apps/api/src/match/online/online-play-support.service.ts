import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { Card } from "../../card/entities/card.entity";
import { DeckCardRole } from "../../common/enums/deckCardRole";
import { Deck } from "../../deck/entities/deck.entity";
import { CardInGame, TcgDexCard, TcgDexEnergy } from "../engine/models/Card";
import {
  CardCategory,
  GamePhase,
  PromptType,
  TurnStep,
} from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import {
  EligibleDeckSummary,
  DeckEligibilityReason,
} from "./online-match.types";
import {
  ONLINE_SUPPORTED_BASIC_ENERGY_NAMES,
  getOnlineSupportedCardDefinition,
  isOnlineSupportedCard,
  normalizeOnlineCardName,
} from "./online-card-registry";
import {
  ReferenceOnlineDeck,
  REFERENCE_ONLINE_DECKS,
} from "./reference-online-decks";

export interface OnlineGamePlayerConfig {
  playerId: string;
  name: string;
  deck: CardInGame[];
}

@Injectable()
export class OnlinePlaySupportService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
  ) {}

  listReferenceDeckPresets(): ReferenceOnlineDeck[] {
    return REFERENCE_ONLINE_DECKS;
  }

  getReferenceDeckPreset(presetId: string): ReferenceOnlineDeck {
    const preset = REFERENCE_ONLINE_DECKS.find(
      (entry) => entry.id === presetId,
    );
    if (!preset) {
      throw new NotFoundException(
        `Reference deck preset ${presetId} not found`,
      );
    }
    return preset;
  }

  evaluateDeckEligibility(
    deck: Deck,
    userId?: number,
    savedDeckIds?: ReadonlySet<number> | number[],
  ): EligibleDeckSummary {
    const reasons: DeckEligibilityReason[] = [];
    const mainboardCards = (deck.cards || []).filter(
      (deckCard) => deckCard.role === DeckCardRole.main,
    );
    const totalCards = mainboardCards.reduce(
      (sum, deckCard) => sum + (deckCard.qty || 0),
      0,
    );

    const savedSet =
      savedDeckIds instanceof Set
        ? savedDeckIds
        : Array.isArray(savedDeckIds)
          ? new Set(savedDeckIds)
          : null;
    const isInLibrary = savedSet ? savedSet.has(deck.id) : false;

    if (
      typeof userId === "number" &&
      deck.user?.id !== userId &&
      !isInLibrary
    ) {
      reasons.push({
        code: "NOT_OWNER",
        message: "You can only use your own decks for online play",
      });
    }

    if (totalCards !== 60) {
      reasons.push({
        code: "INVALID_SIZE",
        message:
          "A Pokemon TCG online deck must contain exactly 60 mainboard cards",
      });
    }

    for (const deckCard of deck.cards || []) {
      if (deckCard.role !== DeckCardRole.main) {
        reasons.push({
          code: "NON_MAINBOARD_CARD",
          message: "Sideboard cards are not supported in online matches",
          cardId: deckCard.card?.id,
          tcgDexId: deckCard.card?.tcgDexId,
          cardName: deckCard.card?.name,
        });
      }
    }

    const hasBasicPokemon = mainboardCards.some((deckCard) =>
      this.isBasicPokemonCardEntity(deckCard.card),
    );
    if (!hasBasicPokemon) {
      reasons.push({
        code: "MISSING_BASIC_POKEMON",
        message: "The deck must contain at least one Basic Pokemon",
      });
    }

    for (const deckCard of mainboardCards) {
      const card = deckCard.card;
      if (!card || !card.name) {
        reasons.push({
          code: "MISSING_CARD_DATA",
          message: "One or more deck cards are missing card data",
          cardId: card?.id,
        });
        continue;
      }

      if (!this.hasEnoughDataForOnlineMapping(card)) {
        reasons.push({
          code: "MISSING_CARD_DATA",
          message: "One or more cards cannot be mapped to the online engine",
          cardId: card.id,
          tcgDexId: card.tcgDexId,
          cardName: card.name,
        });
        continue;
      }

      // All cards with valid data are accepted for online play
    }

    return {
      deckId: deck.id,
      deckName: deck.name,
      eligible: reasons.length === 0,
      reasons,
      totalCards,
    };
  }

  mapDeckToEngineCards(deck: Deck, ownerId: string): CardInGame[] {
    const cards: CardInGame[] = [];

    for (const deckCard of deck.cards || []) {
      if (deckCard.role !== DeckCardRole.main || deckCard.qty <= 0) {
        continue;
      }

      for (let index = 0; index < deckCard.qty; index += 1) {
        cards.push({
          instanceId: `${ownerId}-${deckCard.card.id}-${index}-${randomUUID()}`,
          ownerId,
          baseCard: this.mapCardEntityToBaseCard(deckCard.card),
        });
      }
    }

    return cards;
  }

  async mapReferenceDeckToEngineCards(
    presetId: string,
    ownerId: string,
  ): Promise<CardInGame[]> {
    const preset = this.getReferenceDeckPreset(presetId);
    const tcgDexIds = preset.cards
      .map((card) => card.tcgDexId)
      .filter((value): value is string => Boolean(value));
    const names = preset.cards
      .map((card) => card.name)
      .filter((value): value is string => Boolean(value));

    const candidates =
      tcgDexIds.length || names.length
        ? await this.cardRepository.find({
            where: [
              ...(tcgDexIds.length ? [{ tcgDexId: In(tcgDexIds) }] : []),
              ...(names.length ? [{ name: In(names) }] : []),
            ],
            relations: ["pokemonDetails"],
          })
        : [];
    const byTcgDexId = new Map<string, Card>();
    const byName = new Map<string, Card>();

    for (const candidate of candidates) {
      if (candidate.tcgDexId && tcgDexIds.includes(candidate.tcgDexId)) {
        if (!byTcgDexId.has(candidate.tcgDexId)) {
          byTcgDexId.set(candidate.tcgDexId, candidate);
        }
      }

      if (candidate.name) {
        const normalized = normalizeOnlineCardName(candidate.name);
        if (
          names.includes(candidate.name) ||
          names.some((name) => normalizeOnlineCardName(name) === normalized)
        ) {
          if (!byName.has(normalized)) {
            byName.set(normalized, candidate);
          }
        }
      }
    }

    const cards: CardInGame[] = [];

    for (const presetCard of preset.cards) {
      const resolvedCard = presetCard.tcgDexId
        ? byTcgDexId.get(presetCard.tcgDexId)
        : byName.get(normalizeOnlineCardName(presetCard.name));

      if (!resolvedCard && presetCard.name) {
        const syntheticBasicEnergy = this.buildSyntheticBasicEnergyBaseCard(
          presetCard.name,
        );
        if (syntheticBasicEnergy) {
          for (let index = 0; index < presetCard.qty; index += 1) {
            cards.push({
              instanceId: `${ownerId}-${syntheticBasicEnergy.id}-${index}-${randomUUID()}`,
              ownerId,
              baseCard: syntheticBasicEnergy,
            });
          }
          continue;
        }
      }

      if (!resolvedCard) {
        throw new NotFoundException(
          `Unable to resolve AI preset card ${presetCard.tcgDexId || presetCard.name}`,
        );
      }

      for (let index = 0; index < presetCard.qty; index += 1) {
        cards.push({
          instanceId: `${ownerId}-${resolvedCard.id}-${index}-${randomUUID()}`,
          ownerId,
          baseCard: this.mapCardEntityToBaseCard(resolvedCard),
        });
      }
    }

    return cards;
  }

  createInitialGameState(input: {
    gameId: string;
    seed: string;
    players: [OnlineGamePlayerConfig, OnlineGamePlayerConfig];
  }): GameState {
    const [playerA, playerB] = input.players;
    const rngState = this.seedToRngState(input.seed);
    const coinFlipWinnerId =
      rngState % 2 === 0 ? playerA.playerId : playerB.playerId;

    return {
      id: input.gameId,
      players: {
        [playerA.playerId]: {
          playerId: playerA.playerId,
          name: playerA.name,
          deck: playerA.deck,
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: null,
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          turnsTaken: 0,
          playerEffects: [],
        },
        [playerB.playerId]: {
          playerId: playerB.playerId,
          name: playerB.name,
          deck: playerB.deck,
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: null,
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          turnsTaken: 0,
          playerEffects: [],
        },
      },
      playerIds: [playerA.playerId, playerB.playerId],
      activePlayerId: playerA.playerId,
      firstPlayerId: null,
      turnNumber: 0,
      gamePhase: GamePhase.Setup,
      turnStep: TurnStep.Main,
      rngState,
      pendingTurnTransitionToPlayerId: null,
      stadium: null,
      pendingPrompt: {
        id: `setup-first-player-${input.gameId}`,
        type: PromptType.ChooseFirstPlayer,
        playerId: coinFlipWinnerId,
        title: "Choisissez le premier joueur",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: playerA.playerId, label: playerA.name },
          { value: playerB.playerId, label: playerB.name },
        ],
        metadata: {
          coinFlipWinnerId,
          coinFlipWinnerName:
            coinFlipWinnerId === playerA.playerId ? playerA.name : playerB.name,
        },
      },
      setup: {
        coinFlipWinnerId,
        mulliganCounts: {
          [playerA.playerId]: 0,
          [playerB.playerId]: 0,
        },
        mulliganBonusDraws: {
          [playerA.playerId]: 0,
          [playerB.playerId]: 0,
        },
        tasks: [],
        openingHandsReady: false,
      },
      resumeAction: null,
      pendingTrainerPlay: null,
      pendingEffectAction: null,
      globalEffects: [],
      pendingExtraPrizes: {},
      winnerId: null,
      winnerReason: null,
    };
  }

  private mapCardEntityToBaseCard(card: Card): TcgDexCard {
    const details = card.pokemonDetails;

    // Priorité 1 : effets synchronisés en base (via npm run sync:effects)
    // Priorité 2 : fallback sur le JSON chargé au boot (rétro-compat)
    const dbEffects = details?.parsedEffects as
      | import("./online-card-registry").SupportedCardDefinition
      | null
      | undefined;
    const supportedDefinition =
      dbEffects ?? getOnlineSupportedCardDefinition(card.tcgDexId);

    if (this.isPokemonCardEntity(card)) {
      const attackDefinitions =
        supportedDefinition && supportedDefinition.kind === "pokemon"
          ? supportedDefinition.attacks
          : {};

      return {
        id: card.id,
        name: card.name || "Unknown Pokemon",
        image: card.image,
        category: CardCategory.Pokemon,
        types: details?.types || [],
        hp: details?.hp || 0,
        stage: details?.stage || "De base",
        suffix: details?.suffix || undefined,
        evolvesFrom: details?.evolveFrom || undefined,
        attacks: (details?.attacks || []).map((attack) => ({
          name: attack.name,
          cost: attack.cost || [],
          damage: attack.damage,
          effect: attack.effect,
          effects: attackDefinitions[attack.name]?.effects,
          ignoreResistance: attackDefinitions[attack.name]?.ignoreResistance,
        })),
        weaknesses: details?.weaknesses || [],
        resistances: details?.resistances || [],
        retreat: details?.retreat || 0,
        prizeCards:
          supportedDefinition && supportedDefinition.kind === "pokemon"
            ? supportedDefinition.prizeCards
            : undefined,
      };
    }

    if (this.isTrainerCardEntity(card)) {
      return {
        id: card.id,
        name: card.name || "Unknown Trainer",
        image: card.image,
        category: CardCategory.Trainer,
        trainerType: details?.trainerType || "Item",
        effect: details?.effect || details?.item?.effect || "",
        playEffects:
          supportedDefinition && supportedDefinition.kind === "trainer"
            ? supportedDefinition.playEffects
            : undefined,
        targetStrategy:
          supportedDefinition && supportedDefinition.kind === "trainer"
            ? supportedDefinition.targetStrategy
            : undefined,
        passiveEffects:
          supportedDefinition && supportedDefinition.kind === "trainer"
            ? supportedDefinition.passiveEffects
            : undefined,
      };
    }

    const providedEnergy = ONLINE_SUPPORTED_BASIC_ENERGY_NAMES[
      normalizeOnlineCardName(card.name)
    ] || ["Incolore"];

    return {
      id: card.id,
      name: card.name || "Unknown Energy",
      image: card.image,
      category: CardCategory.Energy,
      energyType: details?.energyType || "Basic",
      effect: details?.effect || "",
      provides: providedEnergy,
      isSpecial: details?.energyType === "Special",
    };
  }

  private buildSyntheticBasicEnergyBaseCard(name: string): TcgDexEnergy | null {
    const normalizedName = normalizeOnlineCardName(name);
    const provides = ONLINE_SUPPORTED_BASIC_ENERGY_NAMES[normalizedName];
    if (!provides) {
      return null;
    }

    return {
      id: `training-energy-${normalizedName}`,
      name,
      category: CardCategory.Energy,
      image: undefined,
      energyType: "Basic",
      effect: "",
      provides,
      isSpecial: false,
    };
  }

  private hasEnoughDataForOnlineMapping(card: Card): boolean {
    if (this.isEnergyCardEntity(card)) {
      return Boolean(card.name);
    }

    if (this.isTrainerCardEntity(card)) {
      return Boolean(card.name && card.pokemonDetails?.trainerType);
    }

    if (this.isPokemonCardEntity(card)) {
      return Boolean(
        card.name &&
          card.pokemonDetails?.stage &&
          card.pokemonDetails?.hp &&
          card.pokemonDetails?.attacks,
      );
    }

    return false;
  }

  private isBasicPokemonCardEntity(card?: Card | null): boolean {
    return (
      this.isPokemonCardEntity(card) &&
      card?.pokemonDetails?.stage === "De base"
    );
  }

  private isPokemonCardEntity(card?: Card | null): boolean {
    return Boolean(
      card &&
        (card.pokemonDetails?.stage ||
          (card.category || "").toLowerCase().includes("pokemon")),
    );
  }

  private isTrainerCardEntity(card?: Card | null): boolean {
    return Boolean(card && card.pokemonDetails?.trainerType);
  }

  private isEnergyCardEntity(card?: Card | null): boolean {
    return Boolean(
      card &&
        (card.pokemonDetails?.energyType ||
          normalizeOnlineCardName(card.name) in
            ONLINE_SUPPORTED_BASIC_ENERGY_NAMES),
    );
  }

  private seedToRngState(seed: string): number {
    const numericSeed = Number(seed);
    if (Number.isFinite(numericSeed) && numericSeed > 0) {
      return numericSeed % 4294967296;
    }

    let hash = 0;
    for (const char of seed) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return hash || 1;
  }
}
