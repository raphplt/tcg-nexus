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
import { SavedDeck } from "../../deck/entities/saved-deck.entity";
import { User } from "../../user/entities/user.entity";
import { PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import { GameFinishedReason, GamePhase } from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import { PromptResponse } from "../engine/models/Prompt";
import { Match, MatchStatus } from "../entities/match.entity";
import {
  OnlineMatchSession,
  OnlineMatchSessionStatus,
} from "../entities/online-match-session.entity";
import { MatchService } from "../match.service";
import {
  DeckEligibilityResult,
  MatchParticipantSlot,
  OnlineMatchLogEntry,
  OnlineMatchSessionView,
} from "./online-match.types";
import { OnlinePlaySupportService } from "./online-play-support.service";

@Injectable()
export class MatchOnlineService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(OnlineMatchSession)
    private readonly onlineSessionRepository: Repository<OnlineMatchSession>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(SavedDeck)
    private readonly savedDeckRepository: Repository<SavedDeck>,
    private readonly matchService: MatchService,
    private readonly onlinePlaySupportService: OnlinePlaySupportService,
  ) {}

  async getDeckEligibility(
    matchId: number,
    user: User,
  ): Promise<DeckEligibilityResult> {
    const { match, slot } = await this.loadMatchForUser(matchId, user.id);
    const session = await this.findOrCreateSession(match);
    const [decks, savedIds] = await Promise.all([
      this.loadUserDecks(user.id),
      this.loadSavedDeckIds(user.id),
    ]);
    const savedSet = new Set(savedIds);
    const eligibleDecks = decks.map((deck) =>
      this.onlinePlaySupportService.evaluateDeckEligibility(
        deck,
        user.id,
        savedSet,
      ),
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

  async getSessionView(
    matchId: number,
    user: User,
  ): Promise<OnlineMatchSessionView> {
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
      throw new BadRequestException(
        "This match can no longer start an online session",
      );
    }

    if (deckId) {
      const deck = await this.loadOwnedDeck(deckId, user.id);
      const savedIds = await this.loadSavedDeckIds(user.id);
      const eligibility = this.onlinePlaySupportService.evaluateDeckEligibility(
        deck,
        user.id,
        new Set(savedIds),
      );
      if (!eligibility.eligible) {
        throw new BadRequestException(
          "Selected deck is not eligible for online play",
        );
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
      throw new ForbiddenException(
        "You cannot dispatch actions for another player",
      );
    }

    const engine = new GameEngine(
      session.serializedState as unknown as GameState,
    );
    const events = engine.dispatch(action);
    await this.persistEngineResult(
      match,
      session,
      engine,
      events,
      enginePlayerId,
      {
        type: "PLAYER_ACTION",
        action,
      },
    );

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
    const engine = new GameEngine(
      session.serializedState as unknown as GameState,
    );
    const events = engine.respondToPrompt(enginePlayerId, response);

    await this.persistEngineResult(
      match,
      session,
      engine,
      events,
      enginePlayerId,
      {
        type: "PROMPT_RESPONSE",
        response,
      },
    );

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
      throw new BadRequestException(
        "This match does not have two assigned players",
      );
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

  private async requireActiveSession(
    match: Match,
  ): Promise<OnlineMatchSession> {
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
        ).getSanitizedState(
          enginePlayerId,
        ) as OnlineMatchSessionView["gameState"])
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
      recentLog: (session.eventLog || []).slice(
        -25,
      ) as unknown as OnlineMatchLogEntry[],
    };
  }

  private async ensureSessionStarted(
    match: Match,
    session: OnlineMatchSession,
  ) {
    if (
      !session.playerADeckId ||
      !session.playerBDeckId ||
      session.serializedState
    ) {
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

    const engine = new GameEngine(
      session.serializedState as unknown as GameState,
    );
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
    const nextLog = (session.eventLog ||
      []) as unknown as OnlineMatchLogEntry[];
    nextLog.push({
      id: randomUUID(),
      kind,
      actorPlayerId,
      timestamp: new Date().toISOString(),
      payload,
    });
    session.eventLog = nextLog.slice(-200) as unknown as Record<
      string,
      unknown
    >[];
  }

  private async loadUserDecks(userId: number): Promise<Deck[]> {
    const savedIds = await this.loadSavedDeckIds(userId);
    return this.deckRepository.find({
      where:
        savedIds.length > 0
          ? [{ user: { id: userId } }, { id: In(savedIds) }]
          : { user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
      order: { id: "ASC" },
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
    return this.onlinePlaySupportService.createInitialGameState({
      gameId: `match-${match.id}`,
      seed,
      players: [
        {
          playerId: playerAId,
          name: playerAName,
          deck: this.onlinePlaySupportService.mapDeckToEngineCards(
            playerADeck,
            playerAId,
          ),
        },
        {
          playerId: playerBId,
          name: playerBName,
          deck: this.onlinePlaySupportService.mapDeckToEngineCards(
            playerBDeck,
            playerBId,
          ),
        },
      ],
    });
  }

  private getDisplayName(user?: User | null): string {
    if (!user) {
      return "Unknown Player";
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email;
  }
}
