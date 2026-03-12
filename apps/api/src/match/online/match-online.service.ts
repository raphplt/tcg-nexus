import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { Card } from "../../card/entities/card.entity";
import { DeckCardRole } from "../../common/enums/deckCardRole";
import { DeckCard } from "../../deck-card/entities/deck-card.entity";
import { Deck } from "../../deck/entities/deck.entity";
import { User } from "../../user/entities/user.entity";
import { PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import {
  CardCategory,
  GameFinishedReason,
  GamePhase,
  PromptType,
  TurnStep,
} from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import { PromptResponse } from "../engine/models/Prompt";
import { MatchService } from "../match.service";
import { Match, MatchStatus } from "../entities/match.entity";
import {
  OnlineMatchSession,
  OnlineMatchSessionStatus,
} from "../entities/online-match-session.entity";
import {
  DeckEligibilityReason,
  DeckEligibilityResult,
  EligibleDeckSummary,
  MatchParticipantSlot,
  OnlineMatchLogEntry,
  OnlineMatchSessionView,
} from "./online-match.types";
import {
  ONLINE_SUPPORTED_BASIC_ENERGY_NAMES,
  getOnlineSupportedCardDefinition,
  isOnlineSupportedCard,
  normalizeOnlineCardName,
} from "./online-card-registry";

@Injectable()
export class MatchOnlineService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(OnlineMatchSession)
    private readonly onlineSessionRepository: Repository<OnlineMatchSession>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    private readonly matchService: MatchService,
  ) {}

  async getDeckEligibility(
    matchId: number,
    user: User,
  ): Promise<DeckEligibilityResult> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.findOrCreateSession(match);
    const decks = await this.loadUserDecks(user.id);
    const eligibleDecks = decks.map((deck) =>
      this.evaluateDeckEligibility(deck, user.id),
    );

    return {
      matchId: match.id,
      sessionStatus: session.status,
      slot,
      selectedDeckId: this.getSelectedDeckIdForSlot(session, slot),
      opponentDeckReady: this.isOpponentDeckReady(session, slot),
      eligibleDecks,
    };
  }

  async getSessionView(matchId: number, user: User): Promise<OnlineMatchSessionView> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.findOrCreateSession(match);
    return this.buildSessionView(match, session, slot);
  }

  async upsertSession(
    matchId: number,
    user: User,
    deckId?: number,
  ): Promise<OnlineMatchSessionView> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.findOrCreateSession(match);

    if (
      match.status === MatchStatus.FINISHED ||
      match.status === MatchStatus.FORFEIT ||
      match.status === MatchStatus.CANCELLED
    ) {
      throw new BadRequestException("This match can no longer start an online session");
    }

    if (deckId) {
      const deck = await this.loadOwnedDeck(deckId, user.id);
      const eligibility = this.evaluateDeckEligibility(deck, user.id);
      if (!eligibility.eligible) {
        throw new BadRequestException("Selected deck is not eligible for online play");
      }

      if (slot === "playerA") {
        session.playerADeckId = deck.id;
      } else {
        session.playerBDeckId = deck.id;
      }

      this.appendLog(session, "ACTION", this.getEnginePlayerId(match, slot), {
        type: "DECK_SELECTED",
        deckId: deck.id,
      });
    }

    await this.ensureSessionStarted(match, session);
    await this.onlineSessionRepository.save(session);

    return this.buildSessionView(match, session, slot);
  }

  async dispatchAction(
    matchId: number,
    user: User,
    action: PlayerAction,
  ): Promise<{
    events: any[];
    roomState: Record<string, ReturnType<GameEngine["getSanitizedState"]>>;
    sessionView: OnlineMatchSessionView;
  }> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.requireActiveSession(match);
    const enginePlayerId = this.getEnginePlayerId(match, slot);

    if (action.playerId !== enginePlayerId) {
      throw new ForbiddenException("You cannot dispatch actions for another player");
    }

    const engine = new GameEngine(session.serializedState as unknown as GameState);
    const events = engine.dispatch(action);
    await this.persistEngineResult(match, session, engine, events, enginePlayerId, {
      type: "PLAYER_ACTION",
      action,
    });

    return {
      events,
      roomState: this.buildRoomState(match, session),
      sessionView: await this.buildSessionView(match, session, slot),
    };
  }

  async respondPrompt(
    matchId: number,
    user: User,
    response: PromptResponse,
  ): Promise<{
    events: any[];
    roomState: Record<string, ReturnType<GameEngine["getSanitizedState"]>>;
    sessionView: OnlineMatchSessionView;
  }> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.requireActiveSession(match);
    const enginePlayerId = this.getEnginePlayerId(match, slot);
    const engine = new GameEngine(session.serializedState as unknown as GameState);
    const events = engine.respondToPrompt(enginePlayerId, response);

    await this.persistEngineResult(match, session, engine, events, enginePlayerId, {
      type: "PROMPT_RESPONSE",
      response,
    });

    return {
      events,
      roomState: this.buildRoomState(match, session),
      sessionView: await this.buildSessionView(match, session, slot),
    };
  }

  private async loadMatchForUser(matchId: number, userId: number) {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
        "onlineSession",
      ],
    });

    if (!match) {
      throw new NotFoundException("Match not found");
    }

    if (!match.playerA || !match.playerB) {
      throw new BadRequestException("This match does not have two assigned players");
    }

    if (match.playerA.user?.id === userId) {
      return { match, slot: "playerA" as MatchParticipantSlot };
    }

    if (match.playerB.user?.id === userId) {
      return { match, slot: "playerB" as MatchParticipantSlot };
    }

    throw new ForbiddenException("You are not a participant in this match");
  }

  private async findOrCreateSession(match: Match): Promise<OnlineMatchSession> {
    if (match.onlineSession) {
      return match.onlineSession;
    }

    const session = this.onlineSessionRepository.create({
      match,
      seed: Date.now().toString(),
      status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
      playerADeckId: null,
      playerBDeckId: null,
      winnerPlayerId: null,
      endedReason: null,
      serializedState: null,
      eventLog: [],
    });

    match.onlineSession = await this.onlineSessionRepository.save(session);
    return match.onlineSession;
  }

  private async requireActiveSession(match: Match): Promise<OnlineMatchSession> {
    const session = await this.findOrCreateSession(match);
    if (!session.serializedState) {
      throw new BadRequestException("Online session has not started yet");
    }
    return session;
  }

  private async buildSessionView(
    match: Match,
    session: OnlineMatchSession,
    slot: MatchParticipantSlot,
  ): Promise<OnlineMatchSessionView> {
    const enginePlayerId = this.getEnginePlayerId(match, slot);
    const gameState = session.serializedState
      ? (new GameEngine(
          session.serializedState as unknown as GameState,
        ).getSanitizedState(enginePlayerId) as OnlineMatchSessionView["gameState"])
      : null;

    return {
      matchId: match.id,
      sessionId: session.id ?? null,
      status: session.status,
      slot,
      enginePlayerId,
      selectedDeckId: this.getSelectedDeckIdForSlot(session, slot),
      opponentDeckReady: this.isOpponentDeckReady(session, slot),
      gameState,
      recentLog: (session.eventLog || []).slice(-25) as unknown as OnlineMatchLogEntry[],
    };
  }

  private async ensureSessionStarted(match: Match, session: OnlineMatchSession) {
    if (!session.playerADeckId || !session.playerBDeckId || session.serializedState) {
      return;
    }

    const [deckA, deckB] = await Promise.all([
      this.loadDeckForSession(session.playerADeckId),
      this.loadDeckForSession(session.playerBDeckId),
    ]);

    session.serializedState = this.createInitialGameState(
      match,
      deckA,
      deckB,
      session.seed,
    ) as unknown as Record<string, unknown>;
    session.status = OnlineMatchSessionStatus.ACTIVE;
    this.appendLog(session, "EVENT", undefined, {
      type: "SESSION_STARTED",
    });

    if (match.status === MatchStatus.SCHEDULED) {
      await this.matchService.startMatch(match.id, {
        notes: "Online match started automatically",
      });
      match.status = MatchStatus.IN_PROGRESS;
    }
  }

  private async persistEngineResult(
    match: Match,
    session: OnlineMatchSession,
    engine: GameEngine,
    events: any[],
    actorPlayerId: string,
    actionPayload: Record<string, unknown>,
  ) {
    const state = engine.getState();
    session.serializedState = state as unknown as Record<string, unknown>;
    this.appendLog(session, "ACTION", actorPlayerId, actionPayload);

    for (const event of events) {
      this.appendLog(session, "EVENT", actorPlayerId, event);
    }

    if (state.gamePhase === GamePhase.Finished && state.winnerId) {
      session.status = OnlineMatchSessionStatus.FINISHED;
      session.endedReason = state.winnerReason;
      session.winnerPlayerId = Number(state.winnerId);
      await this.syncFinishedGameToMatch(match, state);
    } else {
      session.status = OnlineMatchSessionStatus.ACTIVE;
    }

    await this.onlineSessionRepository.save(session);
  }

  private buildRoomState(
    match: Match,
    session: OnlineMatchSession,
  ): Record<string, ReturnType<GameEngine["getSanitizedState"]>> {
    if (!session.serializedState || !match.playerA || !match.playerB) {
      return {};
    }

    const engine = new GameEngine(session.serializedState as unknown as GameState);
    const playerAId = this.getEnginePlayerId(match, "playerA");
    const playerBId = this.getEnginePlayerId(match, "playerB");

    return {
      [playerAId]: engine.getSanitizedState(playerAId),
      [playerBId]: engine.getSanitizedState(playerBId),
    };
  }

  private async syncFinishedGameToMatch(match: Match, state: GameState) {
    if (
      match.status === MatchStatus.FINISHED ||
      match.status === MatchStatus.FORFEIT
    ) {
      return;
    }

    if (match.status === MatchStatus.SCHEDULED) {
      await this.matchService.startMatch(match.id, {
        notes: "Online match auto-started before result sync",
      });
      match.status = MatchStatus.IN_PROGRESS;
    }

    await this.matchService.reportScore(match.id, {
      playerAScore: state.winnerId === String(match.playerA?.id) ? 1 : 0,
      playerBScore: state.winnerId === String(match.playerB?.id) ? 1 : 0,
      isForfeit: state.winnerReason === GameFinishedReason.Forfeit,
      notes: `Result synced from online session (${state.winnerReason || "UNKNOWN"})`,
    });
  }

  private getSelectedDeckIdForSlot(
    session: OnlineMatchSession,
    slot: MatchParticipantSlot,
  ): number | null {
    return slot === "playerA" ? session.playerADeckId : session.playerBDeckId;
  }

  private isOpponentDeckReady(
    session: OnlineMatchSession,
    slot: MatchParticipantSlot,
  ): boolean {
    return slot === "playerA"
      ? Boolean(session.playerBDeckId)
      : Boolean(session.playerADeckId);
  }

  private getEnginePlayerId(match: Match, slot: MatchParticipantSlot): string {
    const player = slot === "playerA" ? match.playerA : match.playerB;
    if (!player) {
      throw new BadRequestException("Match participant is missing");
    }
    return String(player.id);
  }

  private appendLog(
    session: OnlineMatchSession,
    kind: "ACTION" | "EVENT",
    actorPlayerId: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const nextLog = (session.eventLog || []) as unknown as OnlineMatchLogEntry[];
    nextLog.push({
      id: randomUUID(),
      kind,
      actorPlayerId,
      timestamp: new Date().toISOString(),
      payload,
    });
    session.eventLog = nextLog.slice(-200) as unknown as Record<string, unknown>[];
  }

  private async loadUserDecks(userId: number): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
      order: { id: "ASC" },
    });
  }

  private async loadOwnedDeck(deckId: number, userId: number): Promise<Deck> {
    const deck = await this.deckRepository.findOne({
      where: { id: deckId, user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
    });

    if (!deck) {
      throw new NotFoundException("Deck not found");
    }

    return deck;
  }

  private async loadDeckForSession(deckId: number): Promise<Deck> {
    const deck = await this.deckRepository.findOne({
      where: { id: deckId },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    return deck;
  }

  private evaluateDeckEligibility(deck: Deck, userId: number): EligibleDeckSummary {
    const reasons: DeckEligibilityReason[] = [];
    const mainboardCards = (deck.cards || []).filter(
      (deckCard) => deckCard.role === DeckCardRole.main,
    );
    const totalCards = mainboardCards.reduce(
      (sum, deckCard) => sum + (deckCard.qty || 0),
      0,
    );

    if (deck.user?.id !== userId) {
      reasons.push({
        code: "NOT_OWNER",
        message: "You can only use your own decks for online play",
      });
    }

    if (totalCards !== 60) {
      reasons.push({
        code: "INVALID_SIZE",
        message: "A Pokemon TCG online deck must contain exactly 60 mainboard cards",
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

      if (!isOnlineSupportedCard(card.tcgDexId, card.name)) {
        reasons.push({
          code: "UNSUPPORTED_CARD",
          message: "This card is not in the online whitelist yet",
          cardId: card.id,
          tcgDexId: card.tcgDexId,
          cardName: card.name,
        });
      }
    }

    return {
      deckId: deck.id,
      deckName: deck.name,
      eligible: reasons.length === 0,
      reasons,
      totalCards,
    };
  }

  private createInitialGameState(
    match: Match,
    playerADeck: Deck,
    playerBDeck: Deck,
    seed: string,
  ): GameState {
    const playerAId = this.getEnginePlayerId(match, "playerA");
    const playerBId = this.getEnginePlayerId(match, "playerB");
    const playerAName = this.getDisplayName(match.playerA?.user);
    const playerBName = this.getDisplayName(match.playerB?.user);
    const rngState = this.seedToRngState(seed);
    const coinFlipWinnerId = rngState % 2 === 0 ? playerAId : playerBId;

    return {
      id: `match-${match.id}`,
      players: {
        [playerAId]: {
          playerId: playerAId,
          name: playerAName,
          deck: this.mapDeckToEngineCards(playerADeck, playerAId),
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
        },
        [playerBId]: {
          playerId: playerBId,
          name: playerBName,
          deck: this.mapDeckToEngineCards(playerBDeck, playerBId),
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
        },
      },
      playerIds: [playerAId, playerBId],
      activePlayerId: playerAId,
      firstPlayerId: null,
      turnNumber: 0,
      gamePhase: GamePhase.Setup,
      turnStep: TurnStep.Main,
      rngState,
      pendingTurnTransitionToPlayerId: null,
      stadium: null,
      pendingPrompt: {
        id: `setup-first-player-${match.id}`,
        type: PromptType.ChooseFirstPlayer,
        playerId: coinFlipWinnerId,
        title: "Choisissez le premier joueur",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: playerAId, label: playerAName },
          { value: playerBId, label: playerBName },
        ],
      },
      setup: {
        coinFlipWinnerId,
        mulliganCounts: {
          [playerAId]: 0,
          [playerBId]: 0,
        },
        mulliganBonusDraws: {
          [playerAId]: 0,
          [playerBId]: 0,
        },
        tasks: [],
        openingHandsReady: false,
      },
      resumeAction: null,
      pendingTrainerPlay: null,
      winnerId: null,
      winnerReason: null,
    };
  }

  private mapDeckToEngineCards(deck: Deck, ownerId: string) {
    const cards: any[] = [];

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

  private mapCardEntityToBaseCard(card: Card) {
    const details = card.pokemonDetails;
    const supportedDefinition = getOnlineSupportedCardDefinition(card.tcgDexId);

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
      };
    }

    const providedEnergy =
      ONLINE_SUPPORTED_BASIC_ENERGY_NAMES[normalizeOnlineCardName(card.name)] ||
      ["Incolore"];

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
          normalizeOnlineCardName(card.name) in ONLINE_SUPPORTED_BASIC_ENERGY_NAMES),
    );
  }

  private getDisplayName(user?: User | null): string {
    if (!user) {
      return "Unknown Player";
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email;
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
