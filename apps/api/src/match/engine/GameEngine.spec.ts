import { GameEngine } from "./GameEngine";
import { GamePhase, TurnStep } from "./models/enums";
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
          turnsTaken: 0,
          playerEffects: [],
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
          turnsTaken: 0,
          playerEffects: [],
        },
      },
      playerIds: ["Player1", "Player2"],
      activePlayerId: "Player1",
      firstPlayerId: null,
      turnNumber: 1,
      gamePhase: GamePhase.Play,
      turnStep: TurnStep.Main,
      rngState: 12345,
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
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
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

    p1.active!.attachedEnergies.push({
      baseCard: { provides: ["Incolore"] },
    } as any);
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
      attachedEnergies: [{ baseCard: { provides: ["Incolore"] } } as any],
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
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

  it("should take the last prize and finish the game after a knockout", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];
    const p2 = initialState.players["Player2"];

    p1.turnsTaken = 1;
    p1.prizes = [
      {
        instanceId: "prize-1",
        ownerId: "Player1",
        baseCard: { id: "prize", name: "Prize", category: "Dresseur" } as any,
      },
    ];
    p1.active = {
      instanceId: "p1-active",
      ownerId: "Player1",
      specialConditions: [],
      attachedEnergies: [{ baseCard: { provides: ["Incolore"] } } as any],
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
      baseCard: {
        attacks: [{ name: "KO Hit", cost: ["Incolore"], damage: 10 }],
        types: ["Combat"],
      } as any,
    } as any;
    p2.active = {
      instanceId: "p2-active",
      ownerId: "Player2",
      specialConditions: [],
      attachedEnergies: [],
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
      baseCard: {
        hp: 10,
        attacks: [],
        weaknesses: [],
        resistances: [],
      } as any,
    } as any;

    const events = engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(engine.getState().gamePhase).toBe(GamePhase.Finished);
    expect(engine.getState().winnerId).toBe("Player1");
    expect(engine.getState().winnerReason).toBe("PRIZE_OUT");
    expect(events.some((event) => event.type === "PRIZE_CARDS_TAKEN")).toBe(
      true,
    );
  });

  it("should require a promotion after knocking out an active pokemon with a bench", () => {
    const engine = new GameEngine(initialState);
    const p1 = initialState.players["Player1"];
    const p2 = initialState.players["Player2"];

    p1.turnsTaken = 1;
    p1.prizes = new Array(6).fill(null).map((_, index) => ({
      instanceId: `p1-prize-${index}`,
      ownerId: "Player1",
      baseCard: {
        id: `prize-${index}`,
        name: "Prize",
        category: "Dresseur",
      } as any,
    }));
    p1.active = {
      instanceId: "p1-active",
      ownerId: "Player1",
      specialConditions: [],
      attachedEnergies: [{ baseCard: { provides: ["Incolore"] } } as any],
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
      baseCard: {
        attacks: [{ name: "KO Hit", cost: ["Incolore"], damage: 20 }],
        types: ["Combat"],
      } as any,
    } as any;
    p2.active = {
      instanceId: "p2-active",
      ownerId: "Player2",
      specialConditions: [],
      attachedEnergies: [],
      attachedTools: [],
      attachedEvolutions: [],
      damageCounters: 0,
      turnsInPlay: 1,
      temporaryEffects: [],
      baseCard: {
        hp: 10,
        attacks: [],
        weaknesses: [],
        resistances: [],
      } as any,
    } as any;
    p2.bench = [
      {
        instanceId: "p2-bench-1",
        ownerId: "Player2",
        specialConditions: [],
        attachedEnergies: [],
        attachedTools: [],
        attachedEvolutions: [],
        damageCounters: 0,
        turnsInPlay: 1,
        temporaryEffects: [],
        baseCard: {
          hp: 60,
          name: "Bench Mon",
          attacks: [],
          weaknesses: [],
          resistances: [],
        } as any,
      } as any,
    ];
    p2.prizes = new Array(6).fill(null).map((_, index) => ({
      instanceId: `p2-prize-${index}`,
      ownerId: "Player2",
      baseCard: {
        id: `prize-${index}`,
        name: "Prize",
        category: "Dresseur",
      } as any,
    }));

    engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(engine.getState().pendingPrompt?.type).toBe("CHOOSE_PROMOTION");
    expect(engine.getState().pendingPrompt?.playerId).toBe("Player2");
    expect(engine.getState().winnerId).toBeNull();
  });
});
