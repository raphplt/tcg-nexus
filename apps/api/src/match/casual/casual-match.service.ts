import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import { GameFinishedReason, GamePhase } from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import { PromptResponse } from "../engine/models/Prompt";
import {
  CasualMatchSession,
  CasualMatchSessionStatus,
} from "../entities/casual-match-session.entity";
import { OnlinePlaySupportService } from "../online/online-play-support.service";
import { OnlineMatchLogEntry } from "../online/online-match.types";
import {
  CasualActionResult,
  CasualLobbyView,
  CasualMatchSlot,
  CasualSessionSummary,
  CasualSessionView,
} from "./casual-match.types";

@Injectable()
export class CasualMatchService {
  constructor(
    @InjectRepository(CasualMatchSession)
    private readonly sessionRepository: Repository<CasualMatchSession>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly onlinePlaySupportService: OnlinePlaySupportService,
  ) {}

  async getLobby(user: User): Promise<CasualLobbyView> {
    const [decks, sessions] = await Promise.all([
      this.loadUserDecks(user.id),
      this.sessionRepository.find({
        where: [
          { playerA: { id: user.id }, status: In([CasualMatchSessionStatus.WAITING_FOR_DECKS, CasualMatchSessionStatus.ACTIVE]) },
          { playerB: { id: user.id }, status: In([CasualMatchSessionStatus.WAITING_FOR_DECKS, CasualMatchSessionStatus.ACTIVE]) },
        ],
        relations: ["playerA", "playerB"],
        order: { updatedAt: "DESC" },
        take: 10,
      }),
    ]);

    return {
      availableDecks: decks.map((deck) =>
        this.onlinePlaySupportService.evaluateDeckEligibility(deck, user.id),
      ),
      activeSessions: sessions.map((session) =>
        this.buildSessionSummary(session, user.id),
      ),
      queueStatus: "idle",
    };
  }

  async createSession(
    playerAUser: User,
    playerBUser: User,
  ): Promise<CasualMatchSession> {
    const seed = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

    const session = this.sessionRepository.create({
      playerA: playerAUser,
      playerB: playerBUser,
      status: CasualMatchSessionStatus.WAITING_FOR_DECKS,
      seed,
      playerADeckId: null,
      playerBDeckId: null,
      winnerUserId: null,
      endedReason: null,
      serializedState: null,
      eventLog: [],
    });

    this.appendLog(session, "EVENT", undefined, {
      type: "CASUAL_SESSION_CREATED",
    });

    return this.sessionRepository.save(session);
  }

  async selectDeck(
    sessionId: number,
    user: User,
    deckId: number,
  ): Promise<CasualSessionView> {
    const { session, slot } = await this.loadSessionForUser(sessionId, user.id);

    if (
      session.status !== CasualMatchSessionStatus.WAITING_FOR_DECKS &&
      session.status !== CasualMatchSessionStatus.ACTIVE
    ) {
      throw new BadRequestException("This session no longer accepts deck changes");
    }

    const deck = await this.loadOwnedDeck(deckId, user.id);
    const eligibility = this.onlinePlaySupportService.evaluateDeckEligibility(
      deck,
      user.id,
    );
    if (!eligibility.eligible) {
      throw new BadRequestException("Selected deck is not eligible for online play");
    }

    if (slot === "playerA") {
      session.playerADeckId = deck.id;
    } else {
      session.playerBDeckId = deck.id;
    }

    this.appendLog(session, "ACTION", String(user.id), {
      type: "DECK_SELECTED",
      deckId: deck.id,
    });

    await this.tryStartSession(session);
    await this.sessionRepository.save(session);
    return this.buildSessionView(session, slot);
  }

  async getSessionView(
    sessionId: number,
    user: User,
  ): Promise<CasualSessionView> {
    const { session, slot } = await this.loadSessionForUser(sessionId, user.id);
    return this.buildSessionView(session, slot);
  }

  async dispatchAction(
    sessionId: number,
    user: User,
    action: PlayerAction,
  ): Promise<CasualActionResult> {
    const { session, slot } = await this.loadSessionForUser(sessionId, user.id);
    this.requireActive(session);
    const enginePlayerId = this.getEnginePlayerId(session, slot);

    // Auto-set playerId from the authenticated user's slot
    const resolvedAction: PlayerAction = { ...action, playerId: enginePlayerId };

    const engine = new GameEngine(session.serializedState as unknown as GameState);
    const events = engine.dispatch(resolvedAction);

    this.appendLog(session, "ACTION", enginePlayerId, {
      type: "PLAYER_ACTION",
      action: resolvedAction,
    });
    this.appendEvents(session, enginePlayerId, events);
    this.syncSessionFromEngine(session, engine.getState());
    await this.sessionRepository.save(session);

    return {
      session: this.buildSessionView(session, slot),
      events,
    };
  }

  async respondPrompt(
    sessionId: number,
    user: User,
    response: PromptResponse,
  ): Promise<CasualActionResult> {
    const { session, slot } = await this.loadSessionForUser(sessionId, user.id);
    this.requireActive(session);
    const enginePlayerId = this.getEnginePlayerId(session, slot);

    const engine = new GameEngine(session.serializedState as unknown as GameState);
    const events = engine.respondToPrompt(enginePlayerId, response);

    this.appendLog(session, "ACTION", enginePlayerId, {
      type: "PROMPT_RESPONSE",
      response,
    });
    this.appendEvents(session, enginePlayerId, events);
    this.syncSessionFromEngine(session, engine.getState());
    await this.sessionRepository.save(session);

    return {
      session: this.buildSessionView(session, slot),
      events,
    };
  }

  async cancelSession(sessionId: number, userId: number): Promise<void> {
    const { session } = await this.loadSessionForUser(sessionId, userId);
    if (session.status === CasualMatchSessionStatus.FINISHED) {
      return;
    }

    session.status = CasualMatchSessionStatus.CANCELLED;
    session.endedReason = "Cancelled";
    this.appendLog(session, "EVENT", String(userId), {
      type: "SESSION_CANCELLED",
    });
    await this.sessionRepository.save(session);
  }

  private async tryStartSession(session: CasualMatchSession): Promise<void> {
    if (!session.playerADeckId || !session.playerBDeckId || session.serializedState) {
      return;
    }

    const [playerAPlayer, playerBPlayer] = await Promise.all([
      this.loadPlayerForUser(session.playerA.id),
      this.loadPlayerForUser(session.playerB.id),
    ]);
    const [deckA, deckB] = await Promise.all([
      this.loadDeck(session.playerADeckId),
      this.loadDeck(session.playerBDeckId),
    ]);

    const playerAId = String(playerAPlayer.id);
    const playerBId = String(playerBPlayer.id);

    session.serializedState = this.onlinePlaySupportService.createInitialGameState({
      gameId: `casual-${session.id}-${randomUUID()}`,
      seed: session.seed,
      players: [
        {
          playerId: playerAId,
          name: this.getDisplayName(session.playerA),
          deck: this.onlinePlaySupportService.mapDeckToEngineCards(deckA, playerAId),
        },
        {
          playerId: playerBId,
          name: this.getDisplayName(session.playerB),
          deck: this.onlinePlaySupportService.mapDeckToEngineCards(deckB, playerBId),
        },
      ],
    }) as unknown as Record<string, unknown>;

    session.status = CasualMatchSessionStatus.ACTIVE;
    this.appendLog(session, "EVENT", undefined, { type: "SESSION_STARTED" });
  }

  private buildSessionSummary(
    session: CasualMatchSession,
    userId: number,
  ): CasualSessionSummary {
    const isPlayerA = session.playerA.id === userId;
    const opponent = isPlayerA ? session.playerB : session.playerA;

    let turnNumber = 0;
    let awaitingPlayerAction = false;

    if (session.serializedState) {
      const state = session.serializedState as unknown as GameState;
      const slot: CasualMatchSlot = isPlayerA ? "playerA" : "playerB";
      const enginePlayerId = this.getEnginePlayerId(session, slot);
      turnNumber = state.turnNumber;
      awaitingPlayerAction =
        state.pendingPrompt?.playerId === enginePlayerId ||
        (state.gamePhase === GamePhase.Play &&
          state.activePlayerId === enginePlayerId &&
          !state.pendingPrompt);
    }

    return {
      sessionId: session.id,
      status: session.status,
      opponentName: this.getDisplayName(opponent),
      ownDeckSelected: isPlayerA
        ? Boolean(session.playerADeckId)
        : Boolean(session.playerBDeckId),
      turnNumber,
      awaitingPlayerAction,
      updatedAt: session.updatedAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  private buildSessionView(
    session: CasualMatchSession,
    slot: CasualMatchSlot,
  ): CasualSessionView {
    const enginePlayerId = this.getEnginePlayerIdSafe(session, slot);
    const opponent =
      slot === "playerA" ? session.playerB : session.playerA;

    let gameState: CasualSessionView["gameState"] = null;
    if (session.serializedState && enginePlayerId) {
      const engine = new GameEngine(
        session.serializedState as unknown as GameState,
      );
      gameState = engine.getSanitizedState(enginePlayerId) as CasualSessionView["gameState"];
    }

    return {
      sessionId: session.id,
      status: session.status,
      slot,
      enginePlayerId: enginePlayerId || String(session[slot === "playerA" ? "playerA" : "playerB"].id),
      selectedDeckId:
        slot === "playerA" ? session.playerADeckId : session.playerBDeckId,
      opponentDeckReady:
        slot === "playerA"
          ? Boolean(session.playerBDeckId)
          : Boolean(session.playerADeckId),
      opponentName: this.getDisplayName(opponent),
      winnerUserId: session.winnerUserId,
      endedReason: session.endedReason,
      gameState,
      recentLog: (session.eventLog || []).slice(-25) as unknown as OnlineMatchLogEntry[],
    };
  }

  private syncSessionFromEngine(
    session: CasualMatchSession,
    state: GameState,
  ) {
    session.serializedState = state as unknown as Record<string, unknown>;

    if (state.gamePhase === GamePhase.Finished && state.winnerId) {
      session.status = CasualMatchSessionStatus.FINISHED;
      session.winnerUserId = Number(state.winnerId) || null;
      session.endedReason = state.winnerReason;
      return;
    }

    session.status = CasualMatchSessionStatus.ACTIVE;
  }

  private getEnginePlayerId(
    session: CasualMatchSession,
    slot: CasualMatchSlot,
  ): string {
    if (!session.serializedState) {
      throw new BadRequestException("Session has not started yet");
    }

    const state = session.serializedState as unknown as GameState;
    const userId =
      slot === "playerA" ? session.playerA.id : session.playerB.id;

    const playerId = state.playerIds.find((pid) => {
      const player = state.players[pid];
      return player && player.playerId === pid;
    });

    // Engine player IDs are player entity IDs (from Player table), not user IDs.
    // We need to look them up. For the casual system, the engine player IDs
    // are set during createInitialGameState from the Player entity ID.
    // Since we have 2 players, their IDs in engine are their Player entity IDs.
    // The first player in playerIds corresponds to playerA, second to playerB.
    return slot === "playerA" ? state.playerIds[0] : state.playerIds[1];
  }

  private getEnginePlayerIdSafe(
    session: CasualMatchSession,
    slot: CasualMatchSlot,
  ): string | null {
    if (!session.serializedState) {
      return null;
    }

    const state = session.serializedState as unknown as GameState;
    return slot === "playerA" ? state.playerIds[0] : state.playerIds[1];
  }

  private requireActive(session: CasualMatchSession): void {
    if (session.status !== CasualMatchSessionStatus.ACTIVE) {
      throw new BadRequestException("This casual session is not active");
    }
    if (!session.serializedState) {
      throw new BadRequestException("Session has not started yet");
    }
  }

  private async loadSessionForUser(
    sessionId: number,
    userId: number,
  ): Promise<{ session: CasualMatchSession; slot: CasualMatchSlot }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["playerA", "playerB"],
    });

    if (!session) {
      throw new NotFoundException("Casual match session not found");
    }

    if (session.playerA.id === userId) {
      return { session, slot: "playerA" };
    }

    if (session.playerB.id === userId) {
      return { session, slot: "playerB" };
    }

    throw new ForbiddenException("You are not a participant in this session");
  }

  private appendEvents(
    session: CasualMatchSession,
    actorPlayerId: string,
    events: Record<string, unknown>[],
  ) {
    for (const event of events) {
      this.appendLog(session, "EVENT", actorPlayerId, event);
    }
  }

  private appendLog(
    session: CasualMatchSession,
    kind: "ACTION" | "EVENT",
    actorPlayerId: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const nextLog = [...(session.eventLog || [])];
    nextLog.push({
      id: randomUUID(),
      kind,
      actorPlayerId,
      timestamp: new Date().toISOString(),
      payload,
    });
    session.eventLog = nextLog.slice(-200);
  }

  private async loadUserDecks(userId: number): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
      order: { updatedAt: "DESC" },
      take: 8,
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

  private async loadDeck(deckId: number): Promise<Deck> {
    const deck = await this.deckRepository.findOne({
      where: { id: deckId },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    return deck;
  }

  private async loadPlayerForUser(userId: number): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!player) {
      throw new BadRequestException("Player profile is required");
    }

    return player;
  }

  private getDisplayName(user?: User | null): string {
    if (!user) {
      return "Joueur inconnu";
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email;
  }
}
