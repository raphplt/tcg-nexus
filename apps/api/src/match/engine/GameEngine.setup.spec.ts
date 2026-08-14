import { GameEngine } from "./GameEngine";
import { CardInGame } from "./models/Card";
import { CardCategory, GamePhase, PromptType, TurnStep } from "./models/enums";
import { GameState } from "./models/GameState";

/**
 * End-to-end coverage of the setup sequence: coin flip, opening hands, active
 * and bench selection, then the first turn.
 */
describe("GameEngine setup sequence", () => {
  const buildDeck = (ownerId: string): CardInGame[] =>
    Array.from({ length: 60 }, (_, index) => ({
      instanceId: `${ownerId}-card-${index}`,
      ownerId,
      baseCard: {
        id: "basic-pokemon",
        name: "Pikachu",
        category: CardCategory.Pokemon,
        types: ["Électrique"],
        hp: 60,
        stage: "De base",
        attacks: [],
        weaknesses: [],
        resistances: [],
        retreat: 1,
      },
    })) as CardInGame[];

  const buildPlayer = (playerId: string, name: string) => ({
    playerId,
    name,
    deck: buildDeck(playerId),
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
  });

  const buildSetupState = (): GameState =>
    ({
      id: "setup-match",
      players: {
        Player1: buildPlayer("Player1", "Ash"),
        Player2: buildPlayer("Player2", "Gary"),
      },
      playerIds: ["Player1", "Player2"],
      activePlayerId: "Player1",
      firstPlayerId: null,
      turnNumber: 0,
      gamePhase: GamePhase.Setup,
      turnStep: TurnStep.Main,
      rngState: 987654,
      pendingTurnTransitionToPlayerId: null,
      stadium: null,
      pendingPrompt: {
        id: "setup-first-player",
        type: PromptType.ChooseFirstPlayer,
        playerId: "Player1",
        title: "Choisissez le premier joueur",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [
          { value: "Player1", label: "Ash" },
          { value: "Player2", label: "Gary" },
        ],
      },
      setup: {
        coinFlipWinnerId: "Player1",
        mulliganCounts: { Player1: 0, Player2: 0 },
        mulliganBonusDraws: { Player1: 0, Player2: 0 },
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
    }) as unknown as GameState;

  /** Answers every setup prompt until the game reaches the Play phase. */
  const resolveSetup = (engine: GameEngine): void => {
    let guard = 0;

    while (engine.getState().pendingPrompt && guard < 20) {
      guard += 1;
      const prompt = engine.getState().pendingPrompt!;
      const state = engine.getState();

      if (prompt.type === PromptType.ChooseFirstPlayer) {
        engine.respondToPrompt(prompt.playerId, {
          promptId: prompt.id,
          selections: ["Player1"],
        });
        continue;
      }

      if (prompt.type === PromptType.ChooseActive) {
        const [firstCard] = state.players[prompt.playerId].hand;
        engine.respondToPrompt(prompt.playerId, {
          promptId: prompt.id,
          selections: [firstCard.instanceId],
        });
        continue;
      }

      // Bench and mulligan prompts are all optional here.
      engine.respondToPrompt(prompt.playerId, {
        promptId: prompt.id,
        selections: [],
      });
    }
  };

  it("draws a card for the player going first on their opening turn", () => {
    const engine = new GameEngine(buildSetupState());

    resolveSetup(engine);
    const state = engine.getState();

    expect(state.gamePhase).toBe(GamePhase.Play);
    expect(state.activePlayerId).toBe("Player1");
    expect(state.turnNumber).toBe(1);
    // 7 opening cards - 1 played as Active + 1 drawn on turn one.
    expect(state.players.Player1.hand).toHaveLength(7);
    expect(state.players.Player1.prizes).toHaveLength(6);
    // 60 - 7 opening - 6 prizes - 1 turn-one draw. It was 47 while the opening
    // draw was missing.
    expect(state.players.Player1.deck).toHaveLength(46);
    // The second player has not drawn yet: same maths without the draw.
    expect(state.players.Player2.deck).toHaveLength(47);
  });

  it("forbids the player going first from attacking on turn one", () => {
    const engine = new GameEngine(buildSetupState());

    resolveSetup(engine);

    expect(() =>
      engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as never,
        payload: { attackIndex: 0 },
      }),
    ).toThrow("The first player cannot attack on their first turn");
  });
});
