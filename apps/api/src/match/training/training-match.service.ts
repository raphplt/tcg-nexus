import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import { GamePhase } from "../engine/models/enums";
import { PromptResponse } from "../engine/models/Prompt";
import {
  TrainingDifficulty,
  TrainingMatchSession,
  TrainingMatchSessionStatus,
  TrainingMatchWinnerSide,
} from "../entities/training-match-session.entity";
import { OnlinePlaySupportService } from "../online/online-play-support.service";
import { CreateTrainingMatchDto } from "../dto/create-training-match.dto";
import {
  TRAINING_AI_PLAYER_ID,
  TrainingActionResult,
  TrainingLobbyView,
  TrainingSessionSummary,
  TrainingSessionView,
} from "./training-match.types";
import { TrainingAiService } from "./training-ai.service";

@Injectable()
export class TrainingMatchService {
  constructor(
    @InjectRepository(TrainingMatchSession)
    private readonly trainingSessionRepository: Repository<TrainingMatchSession>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly onlinePlaySupportService: OnlinePlaySupportService,
    private readonly trainingAiService: TrainingAiService,
  ) {}

  async getLobby(user: User): Promise<TrainingLobbyView> {
    const [decks, sessions] = await Promise.all([
      this.loadUserDecks(user.id),
      this.trainingSessionRepository.find({
        where: {
          user: {
            id: user.id,
          },
          status: TrainingMatchSessionStatus.ACTIVE,
        },
        order: {
          updatedAt: "DESC",
        },
        take: 8,
      }),
    ]);

    return {
      availableDecks: decks.map((deck) =>
        this.onlinePlaySupportService.evaluateDeckEligibility(deck, user.id),
      ),
      aiDeckPresets: this.onlinePlaySupportService
        .listReferenceDeckPresets()
        .map((preset) => ({
          id: preset.id,
          name: preset.name,
          cardCount: preset.cards.reduce((sum, card) => sum + card.qty, 0),
        })),
      difficulties: [TrainingDifficulty.EASY, TrainingDifficulty.STANDARD],
      activeSessions: sessions.map((session) => this.buildSessionSummary(session)),
    };
  }

  async createSession(
    user: User,
    input: CreateTrainingMatchDto,
  ): Promise<TrainingSessionView> {
    const [deck, player] = await Promise.all([
      this.loadOwnedDeck(input.deckId, user.id),
      this.loadPlayerForUser(user.id),
    ]);
    const eligibility = this.onlinePlaySupportService.evaluateDeckEligibility(
      deck,
      user.id,
    );
    if (!eligibility.eligible) {
      throw new BadRequestException("Selected deck is not eligible for training");
    }

    const preset = this.onlinePlaySupportService.getReferenceDeckPreset(
      input.aiDeckPresetId,
    );
    const seed = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const humanPlayerId = String(player.id);
    const playerDeck = this.onlinePlaySupportService.mapDeckToEngineCards(
      deck,
      humanPlayerId,
    );
    const aiDeck = await this.onlinePlaySupportService.mapReferenceDeckToEngineCards(
      preset.id,
      TRAINING_AI_PLAYER_ID,
    );

    const session = this.trainingSessionRepository.create({
      user,
      status: TrainingMatchSessionStatus.ACTIVE,
      seed,
      playerDeckId: deck.id,
      aiDeckPresetId: preset.id,
      aiDifficulty: input.difficulty,
      serializedState: this.onlinePlaySupportService.createInitialGameState({
        gameId: `training-${user.id}-${randomUUID()}`,
        seed,
        players: [
          {
            playerId: humanPlayerId,
            name: this.getDisplayName(player.user),
            deck: playerDeck,
          },
          {
            playerId: TRAINING_AI_PLAYER_ID,
            name: `IA ${preset.name}`,
            deck: aiDeck,
          },
        ],
      }) as unknown as Record<string, unknown>,
      eventLog: [],
      winnerSide: null,
      endedReason: null,
    });

    this.appendLog(session, "EVENT", undefined, {
      type: "TRAINING_SESSION_CREATED",
      aiDeckPresetId: preset.id,
      difficulty: input.difficulty,
      playerDeckId: deck.id,
    });

    await this.trainingSessionRepository.save(session);
    const { session: advancedSession } = await this.advanceAiUntilHumanTurn(
      session,
    );
    return this.buildSessionView(advancedSession);
  }

  async getSessionView(id: number, user: User): Promise<TrainingSessionView> {
    const session = await this.loadOwnedSession(id, user.id);
    return this.buildSessionView(session);
  }

  async dispatchAction(
    id: number,
    user: User,
    actionInput: Omit<PlayerAction, "playerId">,
  ): Promise<TrainingActionResult> {
    const session = await this.requireActiveSession(id, user.id);
    const engine = new GameEngine(this.readGameState(session));
    const humanPlayerId = this.getHumanPlayerId(engine.getState());
    const action: PlayerAction = {
      ...actionInput,
      playerId: humanPlayerId,
    };
    const events = engine.dispatch(action);

    this.appendLog(session, "ACTION", humanPlayerId, {
      type: "PLAYER_ACTION",
      action,
    });
    this.appendEvents(session, humanPlayerId, events);
    this.syncSessionFromEngine(session, engine.getState());
    await this.trainingSessionRepository.save(session);

    const aiResult = await this.advanceAiUntilHumanTurn(session);

    return {
      session: this.buildSessionView(aiResult.session),
      events: [...events, ...aiResult.events],
    };
  }

  async respondPrompt(
    id: number,
    user: User,
    response: PromptResponse,
  ): Promise<TrainingActionResult> {
    const session = await this.requireActiveSession(id, user.id);
    const engine = new GameEngine(this.readGameState(session));
    const humanPlayerId = this.getHumanPlayerId(engine.getState());
    const events = engine.respondToPrompt(humanPlayerId, response);

    this.appendLog(session, "ACTION", humanPlayerId, {
      type: "PLAYER_PROMPT_RESPONSE",
      response,
    });
    this.appendEvents(session, humanPlayerId, events);
    this.syncSessionFromEngine(session, engine.getState());
    await this.trainingSessionRepository.save(session);

    const aiResult = await this.advanceAiUntilHumanTurn(session);

    return {
      session: this.buildSessionView(aiResult.session),
      events: [...events, ...aiResult.events],
    };
  }

  private async advanceAiUntilHumanTurn(
    session: TrainingMatchSession,
  ): Promise<{ session: TrainingMatchSession; events: Record<string, unknown>[] }> {
    const aggregatedEvents: Record<string, unknown>[] = [];

    for (let index = 0; index < 80; index += 1) {
      const engine = new GameEngine(this.readGameState(session));
      const state = engine.getState();
      const humanPlayerId = this.getHumanPlayerId(state);

      if (state.gamePhase === GamePhase.Finished) {
        this.syncSessionFromEngine(session, state);
        await this.trainingSessionRepository.save(session);
        return { session, events: aggregatedEvents };
      }

      if (state.pendingPrompt?.playerId === humanPlayerId) {
        await this.trainingSessionRepository.save(session);
        return { session, events: aggregatedEvents };
      }

      if (
        !state.pendingPrompt &&
        state.gamePhase === GamePhase.Play &&
        state.activePlayerId === humanPlayerId
      ) {
        await this.trainingSessionRepository.save(session);
        return { session, events: aggregatedEvents };
      }

      let nextEvents: Record<string, unknown>[] = [];

      try {
        const decision = this.trainingAiService.decideNextMove(
          engine,
          TRAINING_AI_PLAYER_ID,
          session.aiDifficulty,
          session.seed,
        );

        if (!decision) {
          await this.trainingSessionRepository.save(session);
          return { session, events: aggregatedEvents };
        }

        if (decision.kind === "prompt") {
          this.appendLog(session, "ACTION", TRAINING_AI_PLAYER_ID, {
            type: "AI_PROMPT_RESPONSE",
            response: decision.response,
          });
          nextEvents = engine.respondToPrompt(TRAINING_AI_PLAYER_ID, decision.response);
        } else {
          this.appendLog(session, "ACTION", TRAINING_AI_PLAYER_ID, {
            type: "AI_ACTION",
            action: decision.action,
          });
          nextEvents = engine.dispatch(decision.action);
        }
      } catch (error: any) {
        this.appendLog(session, "EVENT", TRAINING_AI_PLAYER_ID, {
          type: "AI_BLOCKING_ERROR",
          message: error?.message || "Unknown AI error",
        });
        await this.trainingSessionRepository.save(session);
        throw error;
      }

      aggregatedEvents.push(...nextEvents);
      this.appendEvents(session, TRAINING_AI_PLAYER_ID, nextEvents);
      this.syncSessionFromEngine(session, engine.getState());

      if (session.status === TrainingMatchSessionStatus.FINISHED) {
        await this.trainingSessionRepository.save(session);
        return { session, events: aggregatedEvents };
      }
    }

    throw new BadRequestException("Training AI loop exceeded the safety limit");
  }

  private buildSessionSummary(
    session: TrainingMatchSession,
  ): TrainingSessionSummary {
    const state = this.readGameState(session);
    const humanPlayerId = this.getHumanPlayerId(state);
    const engine = new GameEngine(state);
    const sanitizedState = engine.getSanitizedState(humanPlayerId);

    return {
      sessionId: session.id,
      status: session.status,
      aiDeckPresetId: session.aiDeckPresetId,
      aiDeckPresetName: this.getAiPresetName(session.aiDeckPresetId),
      aiDifficulty: session.aiDifficulty,
      turnNumber: sanitizedState.turnNumber,
      awaitingPlayerAction:
        sanitizedState.awaitingPlayerId === humanPlayerId ||
        (sanitizedState.gamePhase === GamePhase.Play &&
          sanitizedState.activePlayerId === humanPlayerId),
      updatedAt: session.updatedAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }

  private buildSessionView(session: TrainingMatchSession): TrainingSessionView {
    const state = this.readGameState(session);
    const humanPlayerId = this.getHumanPlayerId(state);
    const engine = new GameEngine(state);

    return {
      sessionId: session.id,
      status: session.status,
      playerDeckId: session.playerDeckId,
      aiDeckPresetId: session.aiDeckPresetId,
      aiDeckPresetName: this.getAiPresetName(session.aiDeckPresetId),
      aiDifficulty: session.aiDifficulty,
      humanPlayerId,
      aiPlayerId: TRAINING_AI_PLAYER_ID,
      winnerSide: session.winnerSide,
      endedReason: session.endedReason,
      gameState: engine.getSanitizedState(
        humanPlayerId,
      ) as TrainingSessionView["gameState"],
      recentLog: (session.eventLog || []).slice(-40) as unknown as TrainingSessionView["recentLog"],
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private syncSessionFromEngine(
    session: TrainingMatchSession,
    state: ReturnType<GameEngine["getState"]>,
  ) {
    session.serializedState = state as unknown as Record<string, unknown>;
    session.endedReason = state.winnerReason;

    if (state.gamePhase === GamePhase.Finished && state.winnerId) {
      const humanPlayerId = this.getHumanPlayerId(state);
      session.status = TrainingMatchSessionStatus.FINISHED;
      session.winnerSide =
        state.winnerId === humanPlayerId
          ? TrainingMatchWinnerSide.PLAYER
          : TrainingMatchWinnerSide.AI;
      return;
    }

    session.status = TrainingMatchSessionStatus.ACTIVE;
    session.winnerSide = null;
  }

  private appendEvents(
    session: TrainingMatchSession,
    actorPlayerId: string,
    events: Record<string, unknown>[],
  ) {
    for (const event of events) {
      this.appendLog(session, "EVENT", actorPlayerId, event);
    }
  }

  private appendLog(
    session: TrainingMatchSession,
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
    session.eventLog = nextLog.slice(-250);
  }

  private readGameState(session: TrainingMatchSession) {
    return session.serializedState as unknown as ReturnType<GameEngine["getState"]>;
  }

  private getHumanPlayerId(state: ReturnType<GameEngine["getState"]>): string {
    const humanPlayerId = state.playerIds.find(
      (playerId) => playerId !== TRAINING_AI_PLAYER_ID,
    );

    if (!humanPlayerId) {
      throw new BadRequestException("Training session human player is missing");
    }

    return humanPlayerId;
  }

  private getAiPresetName(presetId: string): string {
    return this.onlinePlaySupportService.getReferenceDeckPreset(presetId).name;
  }

  private async requireActiveSession(id: number, userId: number) {
    const session = await this.loadOwnedSession(id, userId);
    if (session.status !== TrainingMatchSessionStatus.ACTIVE) {
      throw new BadRequestException("This training session is no longer active");
    }
    return session;
  }

  private async loadOwnedSession(id: number, userId: number) {
    const session = await this.trainingSessionRepository.findOne({
      where: {
        id,
      },
      relations: ["user"],
    });

    if (!session) {
      throw new NotFoundException("Training session not found");
    }

    if (session.user.id !== userId) {
      throw new ForbiddenException("You do not own this training session");
    }

    return session;
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

  private async loadUserDecks(userId: number): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { user: { id: userId } },
      relations: ["cards", "cards.card", "cards.card.pokemonDetails", "user"],
      order: { updatedAt: "DESC" },
      take: 8,
    });
  }

  private async loadPlayerForUser(userId: number): Promise<Player> {
    const player = await this.playerRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ["user"],
    });

    if (!player) {
      throw new BadRequestException("Player profile is required for training matches");
    }

    return player;
  }

  private getDisplayName(user?: User | null): string {
    if (!user) {
      return "Joueur";
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return fullName || user.email;
  }
}
