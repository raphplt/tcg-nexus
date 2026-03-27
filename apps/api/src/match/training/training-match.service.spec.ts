import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ActionType } from "../engine/actions/Action";
import {
  CardCategory,
  GamePhase,
  PromptType,
  TurnStep,
} from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import {
  TrainingDifficulty,
  TrainingMatchSessionStatus,
} from "../entities/training-match-session.entity";
import { TRAINING_AI_PLAYER_ID } from "./training-match.types";
import { TrainingMatchService } from "./training-match.service";

const HUMAN_PLAYER_ID = "12";

const createPokemon = (instanceId: string, ownerId: string, hp = 100) =>
  ({
    instanceId,
    ownerId,
    baseCard: {
      id: `${instanceId}-base`,
      name: `Pokemon ${instanceId}`,
      category: CardCategory.Pokemon,
      types: ["Feu"],
      hp,
      stage: "De base",
      attacks: [{ name: "Charge", cost: [], damage: 30 }],
      weaknesses: [],
      resistances: [],
      retreat: 1,
    },
    damageCounters: 0,
    specialConditions: [],
    attachedEnergies: [],
    attachedTools: [],
    attachedEvolutions: [],
    turnsInPlay: 1,
    temporaryEffects: [],
  }) as any;

const createEnergy = (instanceId: string, ownerId: string) =>
  ({
    instanceId,
    ownerId,
    baseCard: {
      id: `${instanceId}-base`,
      name: "Feu",
      category: CardCategory.Energy,
      energyType: "Basic",
      effect: "",
      provides: ["Feu"],
      isSpecial: false,
    },
  }) as any;

const createBaseState = (overrides: Partial<GameState> = {}): GameState => ({
  id: "training-service-spec",
  players: {
    [HUMAN_PLAYER_ID]: {
      playerId: HUMAN_PLAYER_ID,
      name: "Player",
      deck: [createEnergy("human-deck-1", HUMAN_PLAYER_ID)],
      hand: [],
      discard: [],
      lostZone: [],
      prizes: [],
      active: createPokemon("human-active", HUMAN_PLAYER_ID),
      bench: [],
      hasPlayedSupporterThisTurn: false,
      hasRetreatedThisTurn: false,
      hasAttachedEnergyThisTurn: false,
      prizeCardsTaken: 0,
      turnsTaken: 1,
      playerEffects: [],
    },
    [TRAINING_AI_PLAYER_ID]: {
      playerId: TRAINING_AI_PLAYER_ID,
      name: "AI",
      deck: [createEnergy("ai-deck-1", TRAINING_AI_PLAYER_ID)],
      hand: [],
      discard: [],
      lostZone: [],
      prizes: [],
      active: createPokemon("ai-active", TRAINING_AI_PLAYER_ID),
      bench: [],
      hasPlayedSupporterThisTurn: false,
      hasRetreatedThisTurn: false,
      hasAttachedEnergyThisTurn: false,
      prizeCardsTaken: 0,
      turnsTaken: 1,
      playerEffects: [],
    },
  },
  playerIds: [HUMAN_PLAYER_ID, TRAINING_AI_PLAYER_ID],
  activePlayerId: HUMAN_PLAYER_ID,
  firstPlayerId: HUMAN_PLAYER_ID,
  turnNumber: 1,
  gamePhase: GamePhase.Play,
  turnStep: TurnStep.Main,
  rngState: 1,
  pendingTurnTransitionToPlayerId: null,
  stadium: null,
  pendingPrompt: null,
  setup: null,
  resumeAction: null,
  pendingTrainerPlay: null,
  winnerId: null,
  winnerReason: null,
  pendingEffectAction: null,
  globalEffects: [],
  pendingExtraPrizes: {},
  ...overrides,
});

describe("TrainingMatchService", () => {
  let service: TrainingMatchService;
  let trainingSessionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let deckRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let playerRepository: {
    findOne: jest.Mock;
  };
  let onlinePlaySupportService: {
    evaluateDeckEligibility: jest.Mock;
    listReferenceDeckPresets: jest.Mock;
    getReferenceDeckPreset: jest.Mock;
    mapDeckToEngineCards: jest.Mock;
    mapReferenceDeckToEngineCards: jest.Mock;
    createInitialGameState: jest.Mock;
  };
  let trainingAiService: {
    decideNextMove: jest.Mock;
  };

  beforeEach(() => {
    trainingSessionRepository = {
      create: jest.fn((input) => ({
        id: 41,
        createdAt: new Date("2026-03-13T09:00:00.000Z"),
        updatedAt: new Date("2026-03-13T09:00:00.000Z"),
        ...input,
      })),
      save: jest.fn(async (session) => ({
        ...session,
        id: session.id || 41,
        createdAt: session.createdAt || new Date("2026-03-13T09:00:00.000Z"),
        updatedAt: new Date("2026-03-13T09:05:00.000Z"),
      })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    deckRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    playerRepository = {
      findOne: jest.fn(),
    };
    onlinePlaySupportService = {
      evaluateDeckEligibility: jest.fn(),
      listReferenceDeckPresets: jest.fn(),
      getReferenceDeckPreset: jest.fn(),
      mapDeckToEngineCards: jest.fn(),
      mapReferenceDeckToEngineCards: jest.fn(),
      createInitialGameState: jest.fn(),
    };
    trainingAiService = {
      decideNextMove: jest.fn(),
    };

    service = new TrainingMatchService(
      trainingSessionRepository as any,
      deckRepository as any,
      playerRepository as any,
      onlinePlaySupportService as any,
      trainingAiService as any,
    );
  });

  it("should reject an ineligible deck on session creation", async () => {
    deckRepository.findOne.mockResolvedValue({
      id: 9,
      name: "Broken Deck",
      user: { id: 5 },
      cards: [],
    });
    playerRepository.findOne.mockResolvedValue({
      id: 12,
      user: { id: 5, email: "player@test.dev" },
    });
    onlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({
      eligible: false,
    });

    await expect(
      service.createSession({ id: 5 } as any, {
        deckId: 9,
        aiDeckPresetId: "mvp-blaziken-lite",
        difficulty: TrainingDifficulty.EASY,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("should create a resumable training session", async () => {
    const setupState = createBaseState({
      gamePhase: GamePhase.Setup,
      activePlayerId: HUMAN_PLAYER_ID,
      pendingPrompt: {
        id: "prompt-human-start",
        type: PromptType.ChooseFirstPlayer,
        playerId: HUMAN_PLAYER_ID,
        title: "Choisissez le premier joueur",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: HUMAN_PLAYER_ID, label: "Player" },
          { value: TRAINING_AI_PLAYER_ID, label: "AI" },
        ],
      },
    });

    deckRepository.findOne.mockResolvedValue({
      id: 9,
      name: "Good Deck",
      user: { id: 5 },
      cards: [],
    });
    playerRepository.findOne.mockResolvedValue({
      id: 12,
      user: {
        id: 5,
        email: "player@test.dev",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    });
    onlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({
      eligible: true,
    });
    onlinePlaySupportService.getReferenceDeckPreset.mockReturnValue({
      id: "mvp-blaziken-lite",
      name: "MVP Blazing Basics",
      cards: [],
    });
    onlinePlaySupportService.mapDeckToEngineCards.mockReturnValue([]);
    onlinePlaySupportService.mapReferenceDeckToEngineCards.mockResolvedValue(
      [],
    );
    onlinePlaySupportService.createInitialGameState.mockReturnValue(setupState);

    const result = await service.createSession({ id: 5 } as any, {
      deckId: 9,
      aiDeckPresetId: "mvp-blaziken-lite",
      difficulty: TrainingDifficulty.STANDARD,
    });

    expect(result.sessionId).toBe(41);
    expect(result.aiDeckPresetName).toBe("MVP Blazing Basics");
    expect(result.aiDifficulty).toBe(TrainingDifficulty.STANDARD);
    expect(result.gameState?.pendingPrompt?.playerId).toBe(HUMAN_PLAYER_ID);
    expect(trainingAiService.decideNextMove).not.toHaveBeenCalled();
  });

  it("should expose active sessions in the training lobby", async () => {
    deckRepository.find.mockResolvedValue([
      { id: 9, name: "Deck 1", user: { id: 5 }, cards: [] },
    ]);
    trainingSessionRepository.find.mockResolvedValue([
      {
        id: 77,
        status: TrainingMatchSessionStatus.ACTIVE,
        user: { id: 5 },
        seed: "1",
        playerDeckId: 9,
        aiDeckPresetId: "mvp-lucario-lite",
        aiDifficulty: TrainingDifficulty.EASY,
        serializedState: createBaseState(),
        eventLog: [],
        winnerSide: null,
        endedReason: null,
        createdAt: new Date("2026-03-13T09:00:00.000Z"),
        updatedAt: new Date("2026-03-13T09:05:00.000Z"),
      },
    ]);
    onlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({
      deckId: 9,
      deckName: "Deck 1",
      eligible: true,
      reasons: [],
      totalCards: 60,
    });
    onlinePlaySupportService.listReferenceDeckPresets.mockReturnValue([
      {
        id: "mvp-lucario-lite",
        name: "MVP Lucario Tempo",
        cards: [{ qty: 60 }],
      },
    ]);
    onlinePlaySupportService.getReferenceDeckPreset.mockReturnValue({
      id: "mvp-lucario-lite",
      name: "MVP Lucario Tempo",
      cards: [{ qty: 60 }],
    });

    const result = await service.getLobby({ id: 5 } as any);

    expect(result.availableDecks).toHaveLength(1);
    expect(result.activeSessions).toHaveLength(1);
    expect(result.activeSessions[0].sessionId).toBe(77);
    expect(result.activeSessions[0].aiDeckPresetName).toBe("MVP Lucario Tempo");
  });

  it("should reject access to another user's session", async () => {
    trainingSessionRepository.findOne.mockResolvedValue({
      id: 99,
      user: { id: 7 },
    });

    await expect(service.getSessionView(99, { id: 5 } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should apply a player action and let the AI finish its turn", async () => {
    const activeSession = {
      id: 60,
      status: TrainingMatchSessionStatus.ACTIVE,
      user: { id: 5 },
      seed: "seed-1",
      playerDeckId: 9,
      aiDeckPresetId: "mvp-blaziken-lite",
      aiDifficulty: TrainingDifficulty.EASY,
      serializedState: createBaseState(),
      eventLog: [],
      winnerSide: null,
      endedReason: null,
      createdAt: new Date("2026-03-13T09:00:00.000Z"),
      updatedAt: new Date("2026-03-13T09:05:00.000Z"),
    };

    trainingSessionRepository.findOne.mockResolvedValue(activeSession);
    onlinePlaySupportService.getReferenceDeckPreset.mockReturnValue({
      id: "mvp-blaziken-lite",
      name: "MVP Blazing Basics",
      cards: [],
    });
    trainingAiService.decideNextMove.mockReturnValue({
      kind: "action",
      action: {
        playerId: TRAINING_AI_PLAYER_ID,
        type: ActionType.END_TURN,
      },
    });

    const result = await service.dispatchAction(60, { id: 5 } as any, {
      type: ActionType.END_TURN,
    });

    expect(trainingAiService.decideNextMove).toHaveBeenCalled();
    expect(result.session.gameState?.activePlayerId).toBe(HUMAN_PLAYER_ID);
    expect(result.events.length).toBeGreaterThan(0);
  });
});
