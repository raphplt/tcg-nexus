import { GameEngine } from "./GameEngine";
import { GamePhase, PlayerId, TurnStep } from "./models/enums";
import { GameState } from "./models/GameState";

describe("GameEngine Basics", () => {
  let initialState: GameState;

  beforeEach(() => {
    initialState = {
      id: "test-match",
      players: {
        Player1: {
          playerId: "Player1",
          name: "Ash",
          deck: [],
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
        },
        Player2: {
          playerId: "Player2",
          name: "Gary",
          deck: [],
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
        },
      },
      playerIds: ["Player1", "Player2"],
      activePlayerId: "Player1",
      turnNumber: 1,
      gamePhase: GamePhase.Play,
      turnStep: TurnStep.Main,
      stadium: null,
      winnerId: null,
    };
  });

  it("should initialize with given state", () => {
    const engine = new GameEngine(initialState);
    expect(engine.getState().id).toBe("test-match");
    expect(engine.getState().activePlayerId).toBe("Player1");
  });

  it("should end turn and switch active player", () => {
    const engine = new GameEngine(initialState);

    // Add dummy cards to Player2 deck to prevent deck-out loss on their draw step
    initialState.players["Player2"].deck = [
      {
        instanceId: "card-1",
        ownerId: "Player2",
        baseCard: { id: "test", name: "Test", category: "Pokémon" } as any,
      },
    ];

    const events = engine.dispatch({
      playerId: "Player1",
      type: "END_TURN" as any,
    });

    const newState = engine.getState();
    expect(newState.activePlayerId).toBe("Player2");
    expect(newState.turnNumber).toBe(2);
    expect(newState.turnStep).toBe(TurnStep.Main); // Assuming it passed draw step

    // Verify Events
    expect(
      events.some(
        (e) => e.type === "TURN_ENDED" && e.newActivePlayer === "Player2",
      ),
    ).toBe(true);
    expect(
      events.some((e) => e.type === "CARD_DRAWN" && e.playerId === "Player2"),
    ).toBe(true);
  });

  it("should prevent acting when not active player", () => {
    const engine = new GameEngine(initialState);

    expect(() => {
      engine.dispatch({
        playerId: "Player2",
        type: "END_TURN" as any,
      });
    }).toThrow("Not your turn");
  });
});
