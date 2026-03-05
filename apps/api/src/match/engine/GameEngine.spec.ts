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

  it("should play a basic pokemon to bench", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];
    p1.hand = [
      {
        instanceId: "card-hand-1",
        ownerId: "Player1",
        baseCard: {
          id: "test",
          name: "TestBasic",
          category: "Pokémon",
          stage: "De base",
        } as any,
      },
    ];

    const events = engine.dispatch({
      playerId: "Player1",
      type: "PLAY_POKEMON_TO_BENCH" as any,
      payload: { cardInstanceId: "card-hand-1" },
    });

    const state = engine.getState();
    expect(state.players["Player1"].active?.instanceId).toBe("card-hand-1");
    expect(state.players["Player1"].hand.length).toBe(0);
    expect(events.some((e) => e.type === "POKEMON_PLAYED")).toBe(true);
  });

  it("should attach energy to active pokemon", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];

    // Set up active
    p1.active = {
      instanceId: "active-1",
      ownerId: "Player1",
      attachedEnergies: [],
      baseCard: {} as any,
    } as any;

    p1.hand = [
      {
        instanceId: "energy-1",
        ownerId: "Player1",
        baseCard: { id: "e1", name: "Fire", category: "Énergie" } as any,
      },
    ];

    const events = engine.dispatch({
      playerId: "Player1",
      type: "ATTACH_ENERGY" as any,
      payload: {
        energyCardInstanceId: "energy-1",
        targetPokemonInstanceId: "active-1",
      },
    });

    const state = engine.getState();
    expect(state.players["Player1"].active?.attachedEnergies.length).toBe(1);
    expect(state.players["Player1"].hasAttachedEnergyThisTurn).toBe(true);
    expect(state.players["Player1"].hand.length).toBe(0);

    expect(() => {
      engine.dispatch({
        playerId: "Player1",
        type: "ATTACH_ENERGY" as any,
        payload: {
          energyCardInstanceId: "none",
          targetPokemonInstanceId: "active-1",
        },
      });
    }).toThrow("Already attached energy this turn");
  });

  it("should prevent attack if not enough energy or special condition", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];

    p1.active = {
      instanceId: "active-1",
      ownerId: "Player1",
      specialConditions: [],
      attachedEnergies: [],
      baseCard: {
        attacks: [{ name: "Scratch", cost: ["Incolore"], damage: 10 }],
      } as any,
    } as any;

    expect(() => {
      engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });
    }).toThrow("Not enough energy attached");

    p1.active!.attachedEnergies.push({} as any); // attach 1 energy dummy
    p1.active!.specialConditions.push("Asleep" as any);

    expect(() => {
      engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });
    }).toThrow("Active Pokemon cannot attack due to a special condition");
  });

  it("should attack and end turn", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];
    initialState.players["Player2"].deck = [{} as any]; // prevent deck out

    p1.active = {
      instanceId: "active-1",
      ownerId: "Player1",
      specialConditions: [],
      attachedEnergies: [{} as any],
      baseCard: {
        attacks: [{ name: "Scratch", cost: ["Incolore"], damage: 10 }],
      } as any,
    } as any;

    const events = engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    const state = engine.getState();
    expect(
      events.some(
        (e) => e.type === "ATTACK_USED" && e.attackName === "Scratch",
      ),
    ).toBe(true);
    // Turn should have ended
    expect(state.activePlayerId).toBe("Player2");
  });
});
