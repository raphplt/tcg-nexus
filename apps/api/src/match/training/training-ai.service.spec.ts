import { ActionType } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import {
  CardCategory,
  GamePhase,
  PromptType,
  TurnStep,
} from "../engine/models/enums";
import { GameState } from "../engine/models/GameState";
import { TrainingDifficulty } from "../entities/training-match-session.entity";
import { TRAINING_AI_PLAYER_ID } from "./training-match.types";
import { TrainingAiService } from "./training-ai.service";

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

const createBaseState = (overrides: Partial<GameState> = {}): GameState => ({
  id: "training-spec",
  players: {
    [HUMAN_PLAYER_ID]: {
      playerId: HUMAN_PLAYER_ID,
      name: "Player",
      deck: [],
      hand: [],
      discard: [],
      lostZone: [],
      prizes: [],
      active: createPokemon("human-active", HUMAN_PLAYER_ID),
      bench: [createPokemon("human-bench", HUMAN_PLAYER_ID)],
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
      deck: [],
      hand: [],
      discard: [],
      lostZone: [],
      prizes: [],
      active: createPokemon("ai-active", TRAINING_AI_PLAYER_ID),
      bench: [createPokemon("ai-bench", TRAINING_AI_PLAYER_ID)],
      hasPlayedSupporterThisTurn: false,
      hasRetreatedThisTurn: false,
      hasAttachedEnergyThisTurn: false,
      prizeCardsTaken: 0,
      turnsTaken: 1,
      playerEffects: [],
    },
  },
  playerIds: [HUMAN_PLAYER_ID, TRAINING_AI_PLAYER_ID],
  activePlayerId: TRAINING_AI_PLAYER_ID,
  firstPlayerId: HUMAN_PLAYER_ID,
  turnNumber: 2,
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
  ...overrides,
});

describe("TrainingAiService", () => {
  let service: TrainingAiService;

  beforeEach(() => {
    service = new TrainingAiService();
  });

  it("should let easy AI choose to start when it wins the toss", () => {
    const engine = new GameEngine(
      createBaseState({
        gamePhase: GamePhase.Setup,
        activePlayerId: HUMAN_PLAYER_ID,
        pendingPrompt: {
          id: "prompt-start",
          type: PromptType.ChooseFirstPlayer,
          playerId: TRAINING_AI_PLAYER_ID,
          title: "Choisissez le premier joueur",
          minSelections: 1,
          maxSelections: 1,
          allowPass: false,
          options: [
            { value: HUMAN_PLAYER_ID, label: "Player" },
            { value: TRAINING_AI_PLAYER_ID, label: "AI" },
          ],
        },
      }),
    );

    const decision = service.decideNextMove(
      engine,
      TRAINING_AI_PLAYER_ID,
      TrainingDifficulty.EASY,
      "seed-1",
    );

    expect(decision).toEqual({
      kind: "prompt",
      response: {
        promptId: "prompt-start",
        selections: [TRAINING_AI_PLAYER_ID],
      },
    });
  });

  it("should let standard AI choose to play second when it wins the toss", () => {
    const engine = new GameEngine(
      createBaseState({
        gamePhase: GamePhase.Setup,
        activePlayerId: HUMAN_PLAYER_ID,
        pendingPrompt: {
          id: "prompt-start",
          type: PromptType.ChooseFirstPlayer,
          playerId: TRAINING_AI_PLAYER_ID,
          title: "Choisissez le premier joueur",
          minSelections: 1,
          maxSelections: 1,
          allowPass: false,
          options: [
            { value: HUMAN_PLAYER_ID, label: "Player" },
            { value: TRAINING_AI_PLAYER_ID, label: "AI" },
          ],
        },
      }),
    );

    const decision = service.decideNextMove(
      engine,
      TRAINING_AI_PLAYER_ID,
      TrainingDifficulty.STANDARD,
      "seed-1",
    );

    expect(decision).toEqual({
      kind: "prompt",
      response: {
        promptId: "prompt-start",
        selections: [HUMAN_PLAYER_ID],
      },
    });
  });

  it("should make standard AI target the best trainer target instead of the first one", () => {
    const state = createBaseState({
      pendingPrompt: {
        id: "prompt-target",
        type: PromptType.ChooseTrainerTarget,
        playerId: TRAINING_AI_PLAYER_ID,
        title: "Choisissez le Pokemon cible",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: "ai-active", label: "Actif" },
          { value: "ai-bench", label: "Banc" },
        ],
      },
    });
    state.players[TRAINING_AI_PLAYER_ID].bench[0].damageCounters = 70;
    const engine = new GameEngine(state);

    const easyDecision = service.decideNextMove(
      engine,
      TRAINING_AI_PLAYER_ID,
      TrainingDifficulty.EASY,
      "seed-2",
    );
    const standardDecision = service.decideNextMove(
      engine,
      TRAINING_AI_PLAYER_ID,
      TrainingDifficulty.STANDARD,
      "seed-2",
    );

    expect(easyDecision).toEqual({
      kind: "prompt",
      response: {
        promptId: "prompt-target",
        selections: ["ai-active"],
      },
    });
    expect(standardDecision).toEqual({
      kind: "prompt",
      response: {
        promptId: "prompt-target",
        selections: ["ai-bench"],
      },
    });
  });

  it("should produce a legal action during the AI turn", () => {
    const engine = new GameEngine(createBaseState());

    const decision = service.decideNextMove(
      engine,
      TRAINING_AI_PLAYER_ID,
      TrainingDifficulty.STANDARD,
      "seed-3",
    );

    expect(decision?.kind).toBe("action");
    if (!decision || decision.kind !== "action") {
      throw new Error("Expected an action decision");
    }
    expect(decision.action.type).toBe(ActionType.ATTACK);
  });
});
