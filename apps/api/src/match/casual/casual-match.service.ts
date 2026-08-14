import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomInt, randomUUID } from "crypto";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { SavedDeck } from "../../deck/entities/saved-deck.entity";
import { Player } from "../../player/entities/player.entity";
import { RankingService } from "../../ranking/ranking.service";
import { User } from "../../user/entities/user.entity";
import { ActionType, PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import { GameFinishedReason, GamePhase } from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import { PromptResponse } from "../engine/models/Prompt";
import {
  CasualMatchSession,
  CasualMatchSessionStatus,
} from "../entities/casual-match-session.entity";
import { GameEvent, OnlineMatchLogEntry } from "../online/online-match.types";
import { OnlinePlaySupportService } from "../online/online-play-support.service";
import {
  CasualActionResult,
  CasualLobbyView,
  CasualMatchSlot,
  CasualSessionSummary,
  CasualSessionView,
} from "./casual-match.types";

@Injectable()
export class CasualMatchService {
  private readonly logger = new Logger(CasualMatchService.name);

  constructor(
    @InjectRepository(CasualMatchSession)
    private readonly sessionRepository: Repository<CasualMatchSession>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(SavedDeck)
    private readonly savedDeckRepository: Repository<SavedDeck>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly onlinePlaySupportService: OnlinePlaySupportService,
    private readonly rankingService: RankingService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Loads a session inside a transaction holding a pessimistic write lock.
   *
   * Every mutation goes through this helper: two concurrent actions on the same
   * session (double click, second tab, auto-forfeit racing a player move) would
   * otherwise both read the same state and the last write would silently
   * discard the other move.
   *
   * @param sessionId - Session to lock.
   * @param userId - User requesting the mutation, used to resolve their slot.
   * @param work - Callback executed while the row is locked.
   * @returns Whatever the callback returns.
   * @throws NotFoundException If the session does not exist.
   * @throws ForbiddenException If the user is not a participant.
   */
  private async withLockedSession<T>(
    sessionId: number,
    userId: number,
    work: (context: {
      manager: EntityManager;
      session: CasualMatchSession;
      slot: CasualMatchSlot;
    }) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      // Lock first without relations: PostgreSQL rejects `FOR UPDATE` on the
      // nullable side of the outer joins TypeORM generates for relations.
      const locked = await manager.findOne(CasualMatchSession, {
        where: { id: sessionId },
        lock: { mode: "pessimistic_write" },
      });

      if (!locked) {
        throw new NotFoundException("Casual match session not found");
      }

      const session = await manager.findOne(CasualMatchSession, {
        where: { id: sessionId },
        relations: ["playerA", "playerB"],
      });

      if (!session) {
        throw new NotFoundException("Casual match session not found");
      }

      return work({
        manager,
        session,
        slot: this.resolveSlot(session, userId),
      });
    });
  }

  /**
   * Resolves which side of the session a user plays on.
   *
   * @throws ForbiddenException If the user is not a participant.
   */
  private resolveSlot(
    session: CasualMatchSession,
    userId: number,
  ): CasualMatchSlot {
    if (session.playerA.id === userId) {
      return "playerA";
    }

    if (session.playerB.id === userId) {
      return "playerB";
    }

    throw new ForbiddenException("You are not a participant in this session");
  }

  /**
   * Tells whether a user already has a session waiting or in progress.
   * Used by the matchmaking queue to refuse a second concurrent game.
   */
  async hasOngoingSession(userId: number): Promise<boolean> {
    const ongoingStatuses = In([
      CasualMatchSessionStatus.WAITING_FOR_DECKS,
      CasualMatchSessionStatus.ACTIVE,
    ]);

    const count = await this.sessionRepository.count({
      where: [
        { playerA: { id: userId }, status: ongoingStatuses },
        { playerB: { id: userId }, status: ongoingStatuses },
      ],
    });

    return count > 0;
  }

  /**
   * Validates upfront everything a pairing will need: a player profile and a
   * deck that the engine can actually load.
   *
   * @throws BadRequestException If the player profile or the deck is unusable.
   * @throws NotFoundException If the deck does not exist for this user.
   */
  async assertCanQueue(userId: number, deckId: number): Promise<void> {
    await this.loadPlayerForUser(userId);
    await this.requireEligibleDeck(deckId, userId);
  }

  /**
   * Loads a session with both participants, without any access control.
   * Reserved for internal callers such as the matchmaking service.
   */
  async findSessionById(sessionId: number): Promise<CasualMatchSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["playerA", "playerB"],
    });
  }

  /**
   * Cancels a session that was created but never became playable, so it stops
   * showing up as an ongoing game in both lobbies.
   */
  async cancelOrphanSession(sessionId: number): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId, status: CasualMatchSessionStatus.WAITING_FOR_DECKS },
      {
        status: CasualMatchSessionStatus.CANCELLED,
        endedReason: "Pairing failed",
      },
    );
  }

  async getLobby(user: User): Promise<CasualLobbyView> {
    const [decks, sessions, savedIds] = await Promise.all([
      this.loadUserDecks(user.id),
      this.sessionRepository.find({
        where: [
          {
            playerA: { id: user.id },
            status: In([
              CasualMatchSessionStatus.WAITING_FOR_DECKS,
              CasualMatchSessionStatus.ACTIVE,
            ]),
          },
          {
            playerB: { id: user.id },
            status: In([
              CasualMatchSessionStatus.WAITING_FOR_DECKS,
              CasualMatchSessionStatus.ACTIVE,
            ]),
          },
        ],
        relations: ["playerA", "playerB"],
        order: { updatedAt: "DESC" },
        take: 10,
      }),
      this.loadSavedDeckIds(user.id),
    ]);
    const savedSet = new Set(savedIds);

    return {
      availableDecks: decks.map((deck) =>
        this.onlinePlaySupportService.evaluateDeckEligibility(
          deck,
          user.id,
          savedSet,
        ),
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
    isRanked: boolean = false,
  ): Promise<CasualMatchSession> {
    // Cryptographic seed: a timestamp-based one is guessable, which would let a
    // player predict the coin flip and their opening draw. Kept under 2^32 so
    // it survives the `Number()` conversion done by the engine RNG.
    const seed = String(randomInt(1, 4294967295));

    const session = this.sessionRepository.create({
      playerA: playerAUser,
      playerB: playerBUser,
      status: CasualMatchSessionStatus.WAITING_FOR_DECKS,
      seed,
      playerADeckId: null,
      playerBDeckId: null,
      winnerUserId: null,
      endedReason: null,
      isRanked,
      serializedState: null,
      eventLog: [],
    });

    this.appendLog(session, "EVENT", undefined, {
      type: "CASUAL_SESSION_CREATED",
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Assigns a deck to the requesting player and starts the game once both
   * players are ready.
   *
   * @throws BadRequestException If the session no longer accepts decks or the deck is ineligible.
   */
  async selectDeck(
    sessionId: number,
    user: User,
    deckId: number,
  ): Promise<CasualSessionView> {
    const deck = await this.requireEligibleDeck(deckId, user.id);

    return this.withLockedSession(
      sessionId,
      user.id,
      async ({ manager, session, slot }) => {
        if (
          session.status !== CasualMatchSessionStatus.WAITING_FOR_DECKS &&
          session.status !== CasualMatchSessionStatus.ACTIVE
        ) {
          throw new BadRequestException(
            "This session no longer accepts deck changes",
          );
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
        await manager.save(session);
        return this.buildSessionView(session, slot);
      },
    );
  }

  /**
   * Loads a deck the user is allowed to play and validates it against the
   * online engine requirements.
   *
   * @throws NotFoundException If the deck is neither owned nor saved by the user.
   * @throws BadRequestException If the deck is not eligible for online play.
   */
  private async requireEligibleDeck(
    deckId: number,
    userId: number,
  ): Promise<Deck> {
    const deck = await this.loadOwnedDeck(deckId, userId);
    const savedIds = await this.loadSavedDeckIds(userId);
    const eligibility = this.onlinePlaySupportService.evaluateDeckEligibility(
      deck,
      userId,
      new Set(savedIds),
    );

    if (!eligibility.eligible) {
      throw new BadRequestException(
        "Selected deck is not eligible for online play",
      );
    }

    return deck;
  }

  async getSessionView(
    sessionId: number,
    user: User,
  ): Promise<CasualSessionView> {
    const { session, slot } = await this.loadSessionForUser(sessionId, user.id);
    return this.buildSessionView(session, slot);
  }

  /**
   * Builds both players' views from a single database read.
   *
   * Broadcasting used to reload the session once per connected socket; a game
   * with two players and a couple of tabs open meant four identical queries and
   * four engine instantiations per action.
   *
   * @param sessionId - Session to render.
   * @returns Views keyed by user id.
   */
  async getSessionViewsByUser(
    sessionId: number,
  ): Promise<Map<number, CasualSessionView>> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ["playerA", "playerB"],
    });

    if (!session) {
      throw new NotFoundException("Casual match session not found");
    }

    return new Map<number, CasualSessionView>([
      [session.playerA.id, this.buildSessionView(session, "playerA")],
      [session.playerB.id, this.buildSessionView(session, "playerB")],
    ]);
  }

  /**
   * Applies a player action to the engine and persists the resulting state.
   *
   * The `playerId` carried by the payload is always overwritten with the slot
   * of the authenticated user, so a client cannot act for its opponent.
   *
   * @throws BadRequestException If the session is not active.
   */
  async dispatchAction(
    sessionId: number,
    user: User,
    action: PlayerAction,
  ): Promise<CasualActionResult> {
    return this.withLockedSession(
      sessionId,
      user.id,
      async ({ manager, session, slot }) => {
        this.requireActive(session);
        const enginePlayerId = this.getEnginePlayerId(session, slot);
        const resolvedAction: PlayerAction = {
          ...action,
          playerId: enginePlayerId,
        };

        const engine = new GameEngine(
          session.serializedState as unknown as GameState,
        );
        const events = engine.dispatch(resolvedAction);

        this.appendLog(session, "ACTION", enginePlayerId, {
          type: "PLAYER_ACTION",
          action: resolvedAction,
        });
        this.appendEvents(session, enginePlayerId, events);
        await this.syncSessionFromEngine(session, engine.getState());
        await manager.save(session);

        return {
          session: this.buildSessionView(session, slot),
          events,
        };
      },
    );
  }

  /**
   * Answers the prompt currently assigned to the requesting player.
   *
   * @throws BadRequestException If the session is not active.
   */
  async respondPrompt(
    sessionId: number,
    user: User,
    response: PromptResponse,
  ): Promise<CasualActionResult> {
    return this.withLockedSession(
      sessionId,
      user.id,
      async ({ manager, session, slot }) => {
        this.requireActive(session);
        const enginePlayerId = this.getEnginePlayerId(session, slot);

        const engine = new GameEngine(
          session.serializedState as unknown as GameState,
        );
        const events = engine.respondToPrompt(enginePlayerId, response);

        this.appendLog(session, "ACTION", enginePlayerId, {
          type: "PROMPT_RESPONSE",
          response,
        });
        this.appendEvents(session, enginePlayerId, events);
        await this.syncSessionFromEngine(session, engine.getState());
        await manager.save(session);

        return {
          session: this.buildSessionView(session, slot),
          events,
        };
      },
    );
  }

  async cancelSession(sessionId: number, userId: number): Promise<void> {
    await this.withLockedSession(
      sessionId,
      userId,
      async ({ manager, session }) => {
        if (session.status === CasualMatchSessionStatus.FINISHED) {
          return;
        }

        session.status = CasualMatchSessionStatus.CANCELLED;
        session.endedReason = "Cancelled";
        this.appendLog(session, "EVENT", String(userId), {
          type: "SESSION_CANCELLED",
        });
        await manager.save(session);
      },
    );
  }

  /**
   * Forfeits the game on behalf of a player who stayed disconnected past the
   * grace period, so the remaining player is not stuck in a frozen session.
   *
   * Unlike a regular action this targets the *absent* player, never the one
   * whose turn it happens to be.
   *
   * @param sessionId - Session to close.
   * @param userId - User who left the game.
   * @returns The events produced by the engine, empty if the session already ended.
   */
  async autoForfeit(
    sessionId: number,
    userId: number,
  ): Promise<CasualActionResult | null> {
    return this.withLockedSession(
      sessionId,
      userId,
      async ({ manager, session, slot }) => {
        if (
          session.status !== CasualMatchSessionStatus.ACTIVE ||
          !session.serializedState
        ) {
          return null;
        }

        const enginePlayerId = this.getEnginePlayerId(session, slot);
        const action: PlayerAction = {
          playerId: enginePlayerId,
          type: ActionType.SURRENDER,
        };

        const engine = new GameEngine(
          session.serializedState as unknown as GameState,
        );
        const events = engine.dispatch(action);

        this.appendLog(session, "ACTION", enginePlayerId, {
          type: "PLAYER_ACTION",
          action,
          reason: "AUTO_FORFEIT_DISCONNECTED",
        });
        this.appendEvents(session, enginePlayerId, events);
        await this.syncSessionFromEngine(session, engine.getState());
        await manager.save(session);

        return {
          session: this.buildSessionView(session, slot),
          events,
        };
      },
    );
  }

  private async tryStartSession(session: CasualMatchSession): Promise<void> {
    if (
      !session.playerADeckId ||
      !session.playerBDeckId ||
      session.serializedState
    ) {
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

    session.serializedState =
      this.onlinePlaySupportService.createInitialGameState({
        gameId: `casual-${session.id}-${randomUUID()}`,
        seed: session.seed,
        players: [
          {
            playerId: playerAId,
            name: this.getDisplayName(session.playerA),
            deck: this.onlinePlaySupportService.mapDeckToEngineCards(
              deckA,
              playerAId,
            ),
          },
          {
            playerId: playerBId,
            name: this.getDisplayName(session.playerB),
            deck: this.onlinePlaySupportService.mapDeckToEngineCards(
              deckB,
              playerBId,
            ),
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
      isRanked: session.isRanked,
      updatedAt: session.updatedAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  private buildSessionView(
    session: CasualMatchSession,
    slot: CasualMatchSlot,
  ): CasualSessionView {
    const enginePlayerId = this.getEnginePlayerIdSafe(session, slot);
    const opponent = slot === "playerA" ? session.playerB : session.playerA;

    let gameState: CasualSessionView["gameState"] = null;
    if (session.serializedState && enginePlayerId) {
      const engine = new GameEngine(
        session.serializedState as unknown as GameState,
      );
      gameState = engine.getSanitizedState(
        enginePlayerId,
      ) as CasualSessionView["gameState"];
    }

    return {
      sessionId: session.id,
      status: session.status,
      slot,
      enginePlayerId:
        enginePlayerId ||
        String(session[slot === "playerA" ? "playerA" : "playerB"].id),
      selectedDeckId:
        slot === "playerA" ? session.playerADeckId : session.playerBDeckId,
      opponentDeckReady:
        slot === "playerA"
          ? Boolean(session.playerBDeckId)
          : Boolean(session.playerADeckId),
      opponentName: this.getDisplayName(opponent),
      winnerUserId: session.winnerUserId,
      endedReason: session.endedReason,
      isRanked: session.isRanked,
      gameState,
      recentLog: (session.eventLog || []).slice(
        -25,
      ) as unknown as OnlineMatchLogEntry[],
    };
  }

  private async syncSessionFromEngine(
    session: CasualMatchSession,
    state: GameState,
  ) {
    session.serializedState = state as unknown as Record<string, unknown>;

    if (state.gamePhase === GamePhase.Finished && state.winnerId) {
      session.status = CasualMatchSessionStatus.FINISHED;

      const isPlayerAWinner = state.winnerId === state.playerIds[0];
      const winnerUserId = isPlayerAWinner
        ? session.playerA.id
        : session.playerB.id;
      const loserUserId = isPlayerAWinner
        ? session.playerB.id
        : session.playerA.id;

      session.winnerUserId = winnerUserId;
      session.endedReason = state.winnerReason;

      if (session.isRanked) {
        try {
          await this.rankingService.updateEloWithHistory(
            winnerUserId,
            loserUserId,
            { casualSessionId: session.id },
          );
        } catch (error) {
          // The game result itself stays valid: only the rating update failed,
          // so the log keeps a trace instead of rolling back the whole match.
          this.appendLog(session, "EVENT", undefined, {
            type: "ELO_UPDATE_FAILED",
            winnerUserId,
            loserUserId,
          });
          this.logger.error(
            `Failed to update ELO after ranked session ${session.id}`,
            error as Error,
          );
        }
      }
      return;
    }

    session.status = CasualMatchSessionStatus.ACTIVE;
  }

  /**
   * Maps a session slot to its engine player id.
   *
   * Engine ids are assigned in `playerIds` order when the game starts:
   * index 0 is always playerA, index 1 always playerB.
   *
   * @throws BadRequestException If the game has not started yet.
   */
  private getEnginePlayerId(
    session: CasualMatchSession,
    slot: CasualMatchSlot,
  ): string {
    const enginePlayerId = this.getEnginePlayerIdSafe(session, slot);

    if (!enginePlayerId) {
      throw new BadRequestException("Session has not started yet");
    }

    return enginePlayerId;
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

    return { session, slot: this.resolveSlot(session, userId) };
  }

  private appendEvents(
    session: CasualMatchSession,
    actorPlayerId: string,
    events: GameEvent[],
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
    const savedIds = await this.loadSavedDeckIds(userId);
    return this.deckRepository.find({
      where:
        savedIds.length > 0
          ? [{ user: { id: userId } }, { id: In(savedIds) }]
          : { user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
      order: { updatedAt: "DESC" },
      take: 16,
    });
  }

  private async loadSavedDeckIds(userId: number): Promise<number[]> {
    const rows = await this.savedDeckRepository
      .createQueryBuilder("savedDeck")
      .innerJoin("savedDeck.user", "savedUser")
      .innerJoin("savedDeck.deck", "deck")
      .select("deck.id", "deckId")
      .where("savedUser.id = :userId", { userId })
      .getRawMany<{ deckId: number }>();
    return rows.map((row) => Number(row.deckId));
  }

  private async loadOwnedDeck(deckId: number, userId: number): Promise<Deck> {
    const ownedDeck = await this.deckRepository.findOne({
      where: { id: deckId, user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
    });

    if (ownedDeck) {
      return ownedDeck;
    }

    const savedEntry = await this.savedDeckRepository.findOne({
      where: { user: { id: userId }, deck: { id: deckId } },
    });

    if (!savedEntry) {
      throw new NotFoundException("Deck not found");
    }

    const savedDeck = await this.deckRepository.findOne({
      where: { id: deckId },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
    });

    if (!savedDeck) {
      throw new NotFoundException("Deck not found");
    }

    return savedDeck;
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
