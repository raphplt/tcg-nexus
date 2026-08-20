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
import { TrainingAiService } from "./training-ai.service";
import { TRAINING_AI_PLAYER_ID } from "./training-match.types";

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

const createEnergyCard = (instanceId: string, ownerId: string) =>
  ({
    instanceId,
    ownerId,
    baseCard: {
      id: `${instanceId}-base`,
      name: "Feu",
      category: CardCategory.Energy,
      isSpecial: false,
    },
  }) as any;

const createTrainerCard = (instanceId: string, ownerId: string) =>
  ({
    instanceId,
    ownerId,
    baseCard: {
      id: `${instanceId}-base`,
      name: "Stadium Test",
      category: CardCategory.Trainer,
      trainerType: "Stadium",
      playEffects: [],
    },
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
  pendingExtraPrizes: {},
  ...overrides,
});

describe("TrainingAiService", () => {
  let service: TrainingAiService;

  beforeEach(() => {
    service = new TrainingAiService();
  });

  describe("prompts handling", () => {
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

    it("should handle CHOOSE_MULLIGAN_DRAW in both easy and standard mode", () => {
      const state = createBaseState({
        pendingPrompt: {
          id: "prompt-mulligan",
          type: PromptType.ChooseMulliganDraw,
          playerId: TRAINING_AI_PLAYER_ID,
          title: "Mulligan cards",
          minSelections: 1,
          maxSelections: 1,
          allowPass: false,
          options: [{ value: "2", label: "Draw 2" }],
        },
      });
      const engine = new GameEngine(state);

      const easyDecision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.EASY,
        "seed-1",
      );
      const standardDecision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.STANDARD,
        "seed-1",
      );

      expect(easyDecision).toEqual({
        kind: "prompt",
        response: { promptId: "prompt-mulligan", numericChoice: 2 },
      });
      expect(standardDecision).toEqual({
        kind: "prompt",
        response: { promptId: "prompt-mulligan", numericChoice: 2 },
      });
    });

    it("should handle CHOOSE_ACTIVE, CHOOSE_BENCH, and CHOOSE_PROMOTION in standard mode", () => {
      const state = createBaseState();
      state.players[TRAINING_AI_PLAYER_ID].hand = [
        createPokemon("hand-p1", TRAINING_AI_PLAYER_ID, 120),
        createPokemon("hand-p2", TRAINING_AI_PLAYER_ID, 60),
      ];

      // Active prompt
      state.pendingPrompt = {
        id: "prompt-active",
        type: PromptType.ChooseActive,
        playerId: TRAINING_AI_PLAYER_ID,
        title: "Choose Active",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: "hand-p1", label: "P1" },
          { value: "hand-p2", label: "P2" },
        ],
      };
      const engine = new GameEngine(state);
      const activeDecision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.STANDARD,
        "seed-1",
      );
      expect(activeDecision).toEqual({
        kind: "prompt",
        response: { promptId: "prompt-active", selections: ["hand-p1"] },
      });

      // Bench prompt
      state.pendingPrompt = {
        id: "prompt-bench",
        type: PromptType.ChooseBench,
        playerId: TRAINING_AI_PLAYER_ID,
        title: "Choose Bench",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [{ value: "hand-p2", label: "P2" }],
      };
      const benchDecision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.STANDARD,
        "seed-1",
      );
      expect(benchDecision).toEqual({
        kind: "prompt",
        response: { promptId: "prompt-bench", selections: ["hand-p2"] },
      });

      // Promotion prompt
      state.pendingPrompt = {
        id: "prompt-promo",
        type: PromptType.ChoosePromotion,
        playerId: TRAINING_AI_PLAYER_ID,
        title: "Promote",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [{ value: "ai-bench", label: "Bench" }],
      };
      const promoDecision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.STANDARD,
        "seed-1",
      );
      expect(promoDecision).toEqual({
        kind: "prompt",
        response: { promptId: "prompt-promo", selections: ["ai-bench"] },
      });
    });

    it("should return null if game is finished or pending prompt belongs to opponent", () => {
      const state = createBaseState({
        gamePhase: GamePhase.Finished,
      });
      const engine = new GameEngine(state);
      expect(
        service.decideNextMove(
          engine,
          TRAINING_AI_PLAYER_ID,
          TrainingDifficulty.EASY,
          "s",
        ),
      ).toBeNull();

      state.gamePhase = GamePhase.Play;
      state.pendingPrompt = {
        id: "p1",
        type: PromptType.ChooseActive,
        playerId: HUMAN_PLAYER_ID,
        title: "Opponent",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [],
      };
      expect(
        service.decideNextMove(
          engine,
          TRAINING_AI_PLAYER_ID,
          TrainingDifficulty.EASY,
          "s",
        ),
      ).toBeNull();
    });
  });

  describe("gameplay decisions (Easy & Standard)", () => {
    it("should let easy AI attach energy when available in hand", () => {
      const state = createBaseState();
      state.players[TRAINING_AI_PLAYER_ID].hand = [
        createEnergyCard("e-1", TRAINING_AI_PLAYER_ID),
      ];
      const engine = new GameEngine(state);

      const decision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.EASY,
        "seed-energy",
      );

      expect(decision?.kind).toBe("action");
      if (decision && decision.kind === "action") {
        expect(decision.action.type).toBe(ActionType.ATTACH_ENERGY);
      }
    });

    it("should let easy AI play basic pokemon to bench", () => {
      const state = createBaseState();
      (state.players[TRAINING_AI_PLAYER_ID].active!.baseCard as any).attacks =
        []; // No playable attack
      state.players[TRAINING_AI_PLAYER_ID].bench = [];
      state.players[TRAINING_AI_PLAYER_ID].hand = [
        createPokemon("basic-p", TRAINING_AI_PLAYER_ID, 80),
      ];
      const engine = new GameEngine(state);

      const decision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.EASY,
        "seed-bench",
      );

      expect(decision?.kind).toBe("action");
      if (decision && decision.kind === "action") {
        expect(decision.action.type).toBe(ActionType.PLAY_POKEMON_TO_BENCH);
      }
    });

    it("should let easy AI play trainer card from hand", () => {
      const state = createBaseState();
      (state.players[TRAINING_AI_PLAYER_ID].active!.baseCard as any).attacks =
        [];
      state.players[TRAINING_AI_PLAYER_ID].hand = [
        createTrainerCard("t-1", TRAINING_AI_PLAYER_ID),
      ];
      const engine = new GameEngine(state);

      const decision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.EASY,
        "seed-trainer",
      );

      expect(decision?.kind).toBe("action");
      if (decision && decision.kind === "action") {
        expect(decision.action.type).toBe(ActionType.PLAY_TRAINER);
      }
    });

    it("should produce a legal attack action for standard AI", () => {
      const engine = new GameEngine(createBaseState());

      const decision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.STANDARD,
        "seed-3",
      );

      expect(decision?.kind).toBe("action");
      if (decision && decision.kind === "action") {
        expect(decision.action.type).toBe(ActionType.ATTACK);
      }
    });

    it("should end turn when no actions or attacks are available", () => {
      const state = createBaseState();
      (state.players[TRAINING_AI_PLAYER_ID].active!.baseCard as any).attacks =
        [];
      state.players[TRAINING_AI_PLAYER_ID].hand = [];
      const engine = new GameEngine(state);

      const decision = service.decideNextMove(
        engine,
        TRAINING_AI_PLAYER_ID,
        TrainingDifficulty.EASY,
        "seed-end",
      );

      expect(decision?.kind).toBe("action");
      if (decision && decision.kind === "action") {
        expect(decision.action.type).toBe(ActionType.END_TURN);
      }
    });
  });
});
