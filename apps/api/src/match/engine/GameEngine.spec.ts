import { GameEngine } from "./GameEngine";
import {
  CardCategory,
  GameFinishedReason,
  GamePhase,
  PromptType,
  SpecialCondition,
  TurnStep,
} from "./models/enums";
import {
  EnergyCardInGame,
  PokemonCardInGame,
  TrainerCardInGame,
} from "./models/Card";
import { GameState } from "./models/GameState";
import { EffectType } from "./effects/Effect";

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
      pendingExtraPrizes: {},
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

    engine.dispatch({
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

  it("wakes up the Asleep Active Pokemon of both players during checkup", () => {
    const engine = new GameEngine(initialState);
    const asleepPokemon = (owner: string) => ({
      instanceId: `${owner}-active`,
      ownerId: owner,
      baseCard: {
        id: "sleepy",
        name: "Sleepy",
        category: "Pokémon",
        hp: 100,
        attacks: [],
      } as any,
      damageCounters: 0,
      attachedEnergies: [],
      specialConditions: ["Asleep"],
      turnsInPlay: 1,
      playedThisTurn: false,
      temporaryEffects: [],
    });

    initialState.players["Player1"].active = asleepPokemon("Player1") as any;
    initialState.players["Player2"].active = asleepPokemon("Player2") as any;
    initialState.players["Player2"].deck = [
      {
        instanceId: "card-1",
        ownerId: "Player2",
        baseCard: { id: "test", name: "Test", category: "Pokémon" } as any,
      },
    ];
    // Deterministic RNG: this seed yields two "heads" in a row.
    initialState.rngState = 3;

    const events = engine.dispatch({
      playerId: "Player1",
      type: "END_TURN" as any,
    });

    const wokenUp = events
      .filter((event) => event.type === "ASLEEP_REMOVED")
      .map((event) => event.playerId);

    // The non-active player used to be skipped entirely.
    expect(wokenUp).toContain("Player2");
  });

  const createPokemonCard = (
    ownerId: string,
    id: string,
    name: string,
    overrides: Partial<PokemonCardInGame["baseCard"]> = {},
  ): PokemonCardInGame => ({
    instanceId: id,
    ownerId,
    damageCounters: 0,
    specialConditions: [],
    attachedEnergies: [],
    attachedTools: [],
    attachedEvolutions: [],
    turnsInPlay: 1,
    temporaryEffects: [],
    usedOncePerGameAttacks: [],
    baseCard: {
      id,
      name,
      category: CardCategory.Pokemon,
      stage: "De base",
      hp: 100,
      types: ["Combat"],
      attacks: [{ name: "Tackle", cost: ["Incolore"], damage: 20 }],
      weaknesses: [],
      resistances: [],
      retreat: 1,
      ...overrides,
    },
  });

  const createEnergyCard = (
    ownerId: string,
    id: string,
    type = "Incolore",
  ): EnergyCardInGame => ({
    instanceId: id,
    ownerId,
    baseCard: {
      id,
      name: `${type} Energy`,
      category: CardCategory.Energy,
      energyType: "Basic",
      provides: [type],
    },
  });

  const createTrainerCard = (
    ownerId: string,
    id: string,
    trainerType: string,
    overrides: Partial<TrainerCardInGame["baseCard"]> = {},
  ): TrainerCardInGame => ({
    instanceId: id,
    ownerId,
    baseCard: {
      id,
      name: `Trainer ${id}`,
      category: CardCategory.Trainer,
      trainerType,
      effect: "Test trainer effect",
      playEffects: [{ type: EffectType.DRAW_CARD, amount: 1 } as any],
      ...overrides,
    },
  });

  describe("Surrender & Forfeit", () => {
    it("should allow active player to surrender and finish game", () => {
      const engine = new GameEngine(initialState);
      const events = engine.dispatch({
        playerId: "Player1",
        type: "SURRENDER" as any,
      });

      const state = engine.getState();
      expect(state.gamePhase).toBe(GamePhase.Finished);
      expect(state.winnerId).toBe("Player2");
      expect(state.winnerReason).toBe(GameFinishedReason.Forfeit);
      expect(
        events.some((e) => e.type === "GAME_OVER" && e.winnerId === "Player2"),
      ).toBe(true);
    });

    it("should allow non-active player to surrender", () => {
      const engine = new GameEngine(initialState);
      const events = engine.dispatch({
        playerId: "Player2",
        type: "SURRENDER" as any,
      });

      const state = engine.getState();
      expect(state.gamePhase).toBe(GamePhase.Finished);
      expect(state.winnerId).toBe("Player1");
      expect(state.winnerReason).toBe(GameFinishedReason.Forfeit);
      expect(
        events.some((e) => e.type === "GAME_OVER" && e.winnerId === "Player1"),
      ).toBe(true);
    });
  });

  describe("Play Pokemon to Bench", () => {
    it("should throw when bench is full (5 pokemon)", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.bench = [
        createPokemonCard("Player1", "b-1", "Bench 1"),
        createPokemonCard("Player1", "b-2", "Bench 2"),
        createPokemonCard("Player1", "b-3", "Bench 3"),
        createPokemonCard("Player1", "b-4", "Bench 4"),
        createPokemonCard("Player1", "b-5", "Bench 5"),
      ];
      const newMon = createPokemonCard("Player1", "hand-mon", "New Mon");
      p1.hand = [newMon];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_POKEMON_TO_BENCH" as any,
          payload: { cardInstanceId: "hand-mon" },
        });
      }).toThrow("Bench is full");
    });

    it("should throw when trying to play a non-Basic pokemon directly to bench", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      const evoMon = createPokemonCard("Player1", "evo-hand", "Stage 1 Mon", {
        stage: "Niveau 1",
      });
      p1.hand = [evoMon];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_POKEMON_TO_BENCH" as any,
          payload: { cardInstanceId: "evo-hand" },
        });
      }).toThrow("Can only play Basic Pokemon directly to bench");
    });

    it("should set as active when active is null", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = null;
      const mon = createPokemonCard("Player1", "hand-mon", "Pikachu");
      p1.hand = [mon];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "PLAY_POKEMON_TO_BENCH" as any,
        payload: { cardInstanceId: "hand-mon" },
      });

      expect(engine.getState().players["Player1"].active?.instanceId).toBe(
        "hand-mon",
      );
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "POKEMON_PLAYED")).toBe(true);
    });

    it("should add to bench when active already exists", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      const mon = createPokemonCard("Player1", "hand-mon", "Pikachu");
      p1.hand = [mon];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "PLAY_POKEMON_TO_BENCH" as any,
        payload: { cardInstanceId: "hand-mon" },
      });

      expect(p1.bench).toHaveLength(1);
      expect(p1.bench[0].instanceId).toBe("hand-mon");
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "POKEMON_PLAYED")).toBe(true);
    });
  });

  describe("Attach Energy", () => {
    it("should throw if already attached energy this turn", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.hasAttachedEnergyThisTurn = true;
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.hand = [createEnergyCard("Player1", "energy-1")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACH_ENERGY" as any,
          payload: {
            energyCardInstanceId: "energy-1",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Already attached energy this turn");
    });

    it("should throw if energy card not in hand", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.hand = [];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACH_ENERGY" as any,
          payload: {
            energyCardInstanceId: "missing-energy",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Energy card not found in hand");
    });

    it("should throw if selected card is not an Energy card", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.hand = [createPokemonCard("Player1", "not-energy", "Pikachu") as any];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACH_ENERGY" as any,
          payload: {
            energyCardInstanceId: "not-energy",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Selected card is not an Energy");
    });

    it("should throw if target pokemon is not on board", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.hand = [createEnergyCard("Player1", "energy-1")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACH_ENERGY" as any,
          payload: {
            energyCardInstanceId: "energy-1",
            targetPokemonInstanceId: "non-existent",
          },
        });
      }).toThrow("Target pokemon not found on the board");
    });

    it("should attach energy to bench pokemon successfully", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      const benchMon = createPokemonCard("Player1", "b-1", "Bench 1");
      p1.bench = [benchMon];
      p1.hand = [createEnergyCard("Player1", "energy-1", "Feu")];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACH_ENERGY" as any,
        payload: {
          energyCardInstanceId: "energy-1",
          targetPokemonInstanceId: "b-1",
        },
      });

      expect(benchMon.attachedEnergies).toHaveLength(1);
      expect(benchMon.attachedEnergies[0].instanceId).toBe("energy-1");
      expect(p1.hand).toHaveLength(0);
      expect(p1.hasAttachedEnergyThisTurn).toBe(true);
      expect(events.some((e) => e.type === "ENERGY_ATTACHED")).toBe(true);
    });
  });

  describe("Evolve Pokemon", () => {
    it("should throw if evolution card not found in hand", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      p1.active = createPokemonCard("Player1", "p1-act", "Charmander");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "missing-evo",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Evolution card not found in hand");
    });

    it("should throw if player tries to evolve on their first turn", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 0;
      const evoCard = createPokemonCard("Player1", "charmeleon", "Charmeleon", {
        stage: "Niveau 1",
        evolvesFrom: "Charmander",
      });
      p1.hand = [evoCard];
      p1.active = createPokemonCard("Player1", "p1-act", "Charmander");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "charmeleon",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("You cannot evolve Pokemon during your first turn");
    });

    it("should throw if card is not a Pokemon", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      p1.hand = [createEnergyCard("Player1", "energy-1") as any];
      p1.active = createPokemonCard("Player1", "p1-act", "Charmander");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "energy-1",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Card is not a Pokemon");
    });

    it("should throw if trying to evolve using a Basic pokemon", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      const basic = createPokemonCard("Player1", "squirtle", "Squirtle", {
        stage: "De base",
      });
      p1.hand = [basic];
      p1.active = createPokemonCard("Player1", "p1-act", "Charmander");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "squirtle",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Cannot evolve into a Basic Pokemon");
    });

    it("should throw if target pokemon was played on the same turn", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      const evoCard = createPokemonCard("Player1", "charmeleon", "Charmeleon", {
        stage: "Niveau 1",
        evolvesFrom: "Charmander",
      });
      p1.hand = [evoCard];
      const target = createPokemonCard("Player1", "p1-act", "Charmander");
      target.turnsInPlay = 0; // played this turn
      p1.active = target;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "charmeleon",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("Cannot evolve a Pokemon the same turn it was played");
    });

    it("should throw if evolvesFrom does not match target name", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      const evoCard = createPokemonCard("Player1", "charmeleon", "Charmeleon", {
        stage: "Niveau 1",
        evolvesFrom: "Charmander",
      });
      p1.hand = [evoCard];
      p1.active = createPokemonCard("Player1", "p1-act", "Bulbasaur");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "EVOLVE_POKEMON" as any,
          payload: {
            evolutionCardInstanceId: "charmeleon",
            targetPokemonInstanceId: "p1-act",
          },
        });
      }).toThrow("This evolution card cannot evolve the selected Pokemon");
    });

    it("should evolve active pokemon, preserving damage and attached energies while clearing conditions", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      const target = createPokemonCard("Player1", "p1-act", "Charmander");
      target.damageCounters = 30;
      target.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      target.specialConditions = [SpecialCondition.Confused];
      p1.active = target;

      const evoCard = createPokemonCard("Player1", "charmeleon", "Charmeleon", {
        stage: "Niveau 1",
        evolvesFrom: "Charmander",
        hp: 90,
      });
      p1.hand = [evoCard];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "EVOLVE_POKEMON" as any,
        payload: {
          evolutionCardInstanceId: "charmeleon",
          targetPokemonInstanceId: "p1-act",
        },
      });

      expect(p1.active?.instanceId).toBe("charmeleon");
      expect(p1.active?.damageCounters).toBe(30);
      expect(p1.active?.attachedEnergies).toHaveLength(1);
      expect(p1.active?.specialConditions).toEqual([]);
      expect(p1.active?.attachedEvolutions).toHaveLength(1);
      expect(p1.active?.attachedEvolutions[0].instanceId).toBe("p1-act");
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "POKEMON_EVOLVED")).toBe(true);
    });

    it("should evolve bench pokemon successfully", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 1;
      p1.active = createPokemonCard("Player1", "p1-act", "Pikachu");
      const benchTarget = createPokemonCard("Player1", "b-1", "Charmander");
      p1.bench = [benchTarget];

      const evoCard = createPokemonCard("Player1", "charmeleon", "Charmeleon", {
        stage: "Niveau 1",
        evolvesFrom: "Charmander",
      });
      p1.hand = [evoCard];

      engine.dispatch({
        playerId: "Player1",
        type: "EVOLVE_POKEMON" as any,
        payload: {
          evolutionCardInstanceId: "charmeleon",
          targetPokemonInstanceId: "b-1",
        },
      });

      expect(p1.bench[0].instanceId).toBe("charmeleon");
      expect(p1.bench[0].attachedEvolutions).toHaveLength(1);
    });
  });

  describe("Retreat", () => {
    it("should throw if no active pokemon", () => {
      const engine = new GameEngine(initialState);
      initialState.players["Player1"].active = null;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "bench-1" },
        });
      }).toThrow("No active Pokemon to retreat");
    });

    it("should throw if already retreated this turn", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.bench = [createPokemonCard("Player1", "b-1", "Bench")];
      p1.hasRetreatedThisTurn = true;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "b-1" },
        });
      }).toThrow("Already retreated this turn");
    });

    it("should throw if active pokemon is Asleep or Paralyzed", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.active.specialConditions = [SpecialCondition.Asleep];
      p1.bench = [createPokemonCard("Player1", "b-1", "Bench")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "b-1" },
        });
      }).toThrow("Active Pokemon cannot retreat due to a special condition");

      p1.active.specialConditions = [SpecialCondition.Paralyzed];
      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "b-1" },
        });
      }).toThrow("Active Pokemon cannot retreat due to a special condition");
    });

    it("should throw if active pokemon has CANT_RETREAT temporary effect", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.active.temporaryEffects = [
        {
          type: "CANT_RETREAT",
          expiresAt: { turnNumber: 2, playerId: "Player1" },
        },
      ];
      p1.bench = [createPokemonCard("Player1", "b-1", "Bench")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "b-1" },
        });
      }).toThrow("Active Pokemon cannot retreat due to an effect");
    });

    it("should throw if target bench pokemon not found", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.active = createPokemonCard("Player1", "p1-act", "Active");
      p1.bench = [];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: { benchPokemonInstanceId: "non-existent" },
        });
      }).toThrow("Target bench Pokemon not found");
    });

    it("should throw if wrong number of energies discarded for retreat cost", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Active", {
        retreat: 1,
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;
      p1.bench = [createPokemonCard("Player1", "b-1", "Bench")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: {
            benchPokemonInstanceId: "b-1",
            discardedEnergyInstanceIds: [],
          },
        });
      }).toThrow("Retreat requires exactly 1 energy to be discarded");
    });

    it("should throw if discarded energy IDs are not attached to active pokemon", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Active", {
        retreat: 1,
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;
      p1.bench = [createPokemonCard("Player1", "b-1", "Bench")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "RETREAT" as any,
          payload: {
            benchPokemonInstanceId: "b-1",
            discardedEnergyInstanceIds: ["e-random"],
          },
        });
      }).toThrow(
        "Selected energy cards are not attached to the active Pokemon",
      );
    });

    it("should retreat successfully: discard energy, swap active/bench, clear Confused but preserve Poisoned", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const energy1 = createEnergyCard("Player1", "e-1");
      const energy2 = createEnergyCard("Player1", "e-2");
      const active = createPokemonCard("Player1", "p1-act", "Active", {
        retreat: 1,
      });
      active.attachedEnergies = [energy1, energy2];
      active.specialConditions = [
        SpecialCondition.Confused,
        SpecialCondition.Poisoned,
      ];
      p1.active = active;

      const bench = createPokemonCard("Player1", "b-1", "Bench");
      p1.bench = [bench];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "RETREAT" as any,
        payload: {
          benchPokemonInstanceId: "b-1",
          discardedEnergyInstanceIds: ["e-1"],
        },
      });

      expect(p1.active?.instanceId).toBe("b-1");
      expect(p1.bench).toHaveLength(1);
      expect(p1.bench[0].instanceId).toBe("p1-act");
      expect(p1.bench[0].attachedEnergies).toHaveLength(1);
      expect(p1.bench[0].attachedEnergies[0].instanceId).toBe("e-2");
      // Discarded energy is in discard pile
      expect(p1.discard).toContainEqual(energy1);
      // Confused cleared, Poisoned remains
      expect(p1.bench[0].specialConditions).toEqual([
        SpecialCondition.Poisoned,
      ]);
      expect(p1.hasRetreatedThisTurn).toBe(true);
      expect(events.some((e) => e.type === "POKEMON_RETREATED")).toBe(true);
    });
  });

  describe("Play Trainer", () => {
    it("should throw if trainer card not in hand", () => {
      const engine = new GameEngine(initialState);
      initialState.players["Player1"].hand = [];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "missing-trainer" },
        });
      }).toThrow("Trainer card not found in hand");
    });

    it("should throw if selected card is not a Trainer", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.hand = [createEnergyCard("Player1", "e-1") as any];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "e-1" },
        });
      }).toThrow("Selected card is not a Trainer");
    });

    it("should throw if blocked by TRAINER_LOCK player effect", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.playerEffects = [{ type: "TRAINER_LOCK", lockType: "ALL" } as any];
      p1.hand = [createTrainerCard("Player1", "t-item", "Item")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "t-item" },
        });
      }).toThrow("Trainer cards are locked by an opponent's effect");
    });

    it("should throw if supporter played twice in the same turn", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.hasPlayedSupporterThisTurn = true;
      p1.hand = [createTrainerCard("Player1", "t-supp", "Supporter")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "t-supp" },
        });
      }).toThrow("Supporter already played this turn");
    });

    it("should throw if first player tries to play supporter on turn 1", () => {
      const engine = new GameEngine(initialState);
      initialState.firstPlayerId = "Player1";
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 0;
      p1.hand = [createTrainerCard("Player1", "t-supp", "Supporter")];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "t-supp" },
        });
      }).toThrow(
        "The first player cannot play a Supporter on their first turn",
      );
    });

    it("should play stadium card, displacing previous stadium to owner discard", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const oldStadium = createTrainerCard("Player2", "old-stad", "Stadium", {
        playEffects: undefined,
      });
      initialState.stadium = oldStadium;

      const newStadium = createTrainerCard("Player1", "new-stad", "Stadium", {
        playEffects: undefined,
      });
      p1.hand = [newStadium];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "PLAY_TRAINER" as any,
        payload: { trainerCardInstanceId: "new-stad" },
      });

      expect(engine.getState().stadium?.instanceId).toBe("new-stad");
      expect(p2.discard).toContainEqual(oldStadium);
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "STADIUM_PLAYED")).toBe(true);
    });

    it("should throw if trainer card has no playEffects", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const unsupported = createTrainerCard("Player1", "no-effects", "Item", {
        playEffects: [],
      });
      p1.hand = [unsupported];

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "PLAY_TRAINER" as any,
          payload: { trainerCardInstanceId: "no-effects" },
        });
      }).toThrow("This trainer card is not supported online yet");
    });

    it("should play item trainer card, resolve effect, and move card to discard", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.deck = [createPokemonCard("Player1", "deck-card", "Card In Deck")];
      const itemCard = createTrainerCard("Player1", "draw-item", "Item", {
        playEffects: [{ type: EffectType.DRAW_CARD, amount: 1 } as any],
      });
      p1.hand = [itemCard];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "PLAY_TRAINER" as any,
        payload: { trainerCardInstanceId: "draw-item" },
      });

      expect(p1.hand.some((c) => c.instanceId === "deck-card")).toBe(true);
      expect(p1.discard.some((c) => c.instanceId === "draw-item")).toBe(true);
      expect(events.some((e) => e.type === "TRAINER_PLAYED")).toBe(true);
    });
  });

  describe("Attack Mechanics & Modifiers", () => {
    it("should throw if no active pokemon", () => {
      const engine = new GameEngine(initialState);
      initialState.players["Player1"].active = null;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACK" as any,
          payload: { attackIndex: 0 },
        });
      }).toThrow("No active Pokemon to attack with");
    });

    it("should throw if first player attacks on their first turn", () => {
      const engine = new GameEngine(initialState);
      initialState.firstPlayerId = "Player1";
      const p1 = initialState.players["Player1"];
      p1.turnsTaken = 0;
      p1.active = createPokemonCard("Player1", "p1-act", "Active");

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACK" as any,
          payload: { attackIndex: 0 },
        });
      }).toThrow("The first player cannot attack on their first turn");
    });

    it("should throw if active pokemon is Paralyzed", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Active");
      active.specialConditions = [SpecialCondition.Paralyzed];
      p1.active = active;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACK" as any,
          payload: { attackIndex: 0 },
        });
      }).toThrow("Active Pokemon cannot attack due to a special condition");
    });

    it("should throw if active pokemon has CANT_ATTACK temporary effect", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Active");
      active.temporaryEffects = [
        {
          type: "CANT_ATTACK",
          expiresAt: { turnNumber: 2, playerId: "Player1" },
        },
      ];
      p1.active = active;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACK" as any,
          payload: { attackIndex: 0 },
        });
      }).toThrow("This Pokemon cannot attack this turn");
    });

    it("should throw if attack cannot be paid with attached energy", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Active", {
        attacks: [{ name: "Big Punch", cost: ["Feu", "Feu"], damage: 50 }],
      });
      active.attachedEnergies = [];
      p1.active = active;

      expect(() => {
        engine.dispatch({
          playerId: "Player1",
          type: "ATTACK" as any,
          payload: { attackIndex: 0 },
        });
      }).toThrow("Not enough energy attached");
    });

    it("should deal damage modified by BOOST_DAMAGE temporary effect", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const active = createPokemonCard("Player1", "p1-act", "Attacker", {
        attacks: [{ name: "Punch", cost: ["Incolore"], damage: 20 }],
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      active.temporaryEffects = [
        {
          type: "BOOST_DAMAGE",
          amount: 30,
          expiresAt: { turnNumber: 2, playerId: "Player1" },
        },
      ];
      p1.active = active;

      const defender = createPokemonCard("Player2", "p2-act", "Defender", {
        hp: 100,
      });
      p2.active = defender;
      p2.deck = [createPokemonCard("Player2", "p2-deck", "Deck Mon")];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      // 20 base + 30 boost = 50 damage
      expect(defender.damageCounters).toBe(50);
      expect(active.temporaryEffects).toHaveLength(0); // effect consumed
      expect(
        events.some((e) => e.type === "DAMAGE_DEALT" && e.amount === 50),
      ).toBe(true);
    });

    it("should prevent damage if defender has PREVENT_DAMAGE effect", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const active = createPokemonCard("Player1", "p1-act", "Attacker", {
        attacks: [{ name: "Punch", cost: ["Incolore"], damage: 20 }],
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;

      const defender = createPokemonCard("Player2", "p2-act", "Defender", {
        hp: 100,
      });
      defender.temporaryEffects = [
        {
          type: "PREVENT_DAMAGE",
          expiresAt: { turnNumber: 2, playerId: "Player2" },
        },
      ];
      p2.active = defender;
      p2.deck = [createPokemonCard("Player2", "p2-deck", "Deck Mon")];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      expect(defender.damageCounters).toBe(0);
      expect(events.some((e) => e.type === "DAMAGE_PREVENTED")).toBe(true);
    });

    it("should self-damage and end turn if confused coin flip tails", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const active = createPokemonCard("Player1", "p1-act", "Attacker", {
        attacks: [{ name: "Punch", cost: ["Incolore"], damage: 20 }],
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      active.specialConditions = [SpecialCondition.Confused];
      p1.active = active;

      initialState.players["Player2"].active = createPokemonCard(
        "Player2",
        "p2-act",
        "Def",
      );
      initialState.players["Player2"].deck = [
        createPokemonCard("Player2", "p2-d", "D"),
      ];

      // Mock nextRandom to return 0.2 (tails < 0.5)
      jest.spyOn(engine, "nextRandom").mockReturnValue(0.2);

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      expect(active.damageCounters).toBe(30);
      expect(
        events.some(
          (e) => e.type === "CONFUSION_SELF_DAMAGE" && e.amount === 30,
        ),
      ).toBe(true);
      expect(engine.getState().activePlayerId).toBe("Player2");
    });

    it("should apply weakness modifier (x2) when attacker type matches defender weakness", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const active = createPokemonCard("Player1", "p1-act", "Fire Attacker", {
        types: ["Feu"],
        attacks: [{ name: "Ember", cost: ["Incolore"], damage: 30 }],
      });
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;

      const defender = createPokemonCard(
        "Player2",
        "p2-act",
        "Grass Defender",
        {
          hp: 100,
          weaknesses: [{ type: "Feu", value: "x2" }],
        },
      );
      p2.active = defender;
      p2.deck = [createPokemonCard("Player2", "p2-d", "D")];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      // 30 * 2 = 60 damage
      expect(defender.damageCounters).toBe(60);
      expect(
        events.some((e) => e.type === "DAMAGE_DEALT" && e.amount === 60),
      ).toBe(true);
    });

    it("should apply resistance modifier when attacker type matches defender resistance", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const active = createPokemonCard(
        "Player1",
        "p1-act",
        "Fighting Attacker",
        {
          types: ["Combat"],
          attacks: [{ name: "Punch", cost: ["Incolore"], damage: 40 }],
        },
      );
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;

      const defender = createPokemonCard(
        "Player2",
        "p2-act",
        "Flying Defender",
        {
          hp: 100,
          resistances: [{ type: "Combat", value: "-20" }],
        },
      );
      p2.active = defender;
      p2.deck = [createPokemonCard("Player2", "p2-d", "D")];

      const events = engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      // 40 - 20 = 20 damage
      expect(defender.damageCounters).toBe(20);
      expect(
        events.some((e) => e.type === "DAMAGE_DEALT" && e.amount === 20),
      ).toBe(true);
    });

    it("should ignore resistance if attack specifies ignoreResistance", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const p2 = initialState.players["Player2"];
      const active = createPokemonCard(
        "Player1",
        "p1-act",
        "Piercing Attacker",
        {
          types: ["Combat"],
          attacks: [
            {
              name: "Pierce",
              cost: ["Incolore"],
              damage: 40,
              ignoreResistance: true,
            },
          ],
        },
      );
      active.attachedEnergies = [createEnergyCard("Player1", "e-1")];
      p1.active = active;

      const defender = createPokemonCard(
        "Player2",
        "p2-act",
        "Flying Defender",
        {
          hp: 100,
          resistances: [{ type: "Combat", value: "-20" }],
        },
      );
      p2.active = defender;
      p2.deck = [createPokemonCard("Player2", "p2-d", "D")];

      engine.dispatch({
        playerId: "Player1",
        type: "ATTACK" as any,
        payload: { attackIndex: 0 },
      });

      // 40 damage directly because resistance is ignored
      expect(defender.damageCounters).toBe(40);
    });
  });

  describe("Prompt Responses & Validations", () => {
    it("should throw if no prompt is pending", () => {
      const engine = new GameEngine(initialState);
      expect(() => {
        engine.respondToPrompt("Player1", { promptId: "p1" });
      }).toThrow("No prompt is currently pending");
    });

    it("should throw if prompt is assigned to another player", () => {
      const engine = new GameEngine(initialState);
      initialState.pendingPrompt = {
        id: "prompt-1",
        playerId: "Player2",
        type: PromptType.ChooseActive,
        title: "Test",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [],
      };

      expect(() => {
        engine.respondToPrompt("Player1", { promptId: "prompt-1" });
      }).toThrow("This prompt is not assigned to you");
    });

    it("should throw if promptId does not match pending prompt", () => {
      const engine = new GameEngine(initialState);
      initialState.pendingPrompt = {
        id: "prompt-1",
        playerId: "Player1",
        type: PromptType.ChooseActive,
        title: "Test",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [],
      };

      expect(() => {
        engine.respondToPrompt("Player1", { promptId: "wrong-id" });
      }).toThrow("Prompt mismatch");
    });

    it("should handle ChooseActive prompt successfully", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      const mon = createPokemonCard("Player1", "hand-1", "Pikachu");
      p1.hand = [mon];

      initialState.pendingPrompt = {
        id: "prompt-active",
        playerId: "Player1",
        type: PromptType.ChooseActive,
        title: "Choose Active",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options: [],
      };

      const events = engine.respondToPrompt("Player1", {
        promptId: "prompt-active",
        selections: ["hand-1"],
      });

      expect(engine.getState().players["Player1"].active?.instanceId).toBe(
        "hand-1",
      );
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "ACTIVE_POKEMON_CHOSEN")).toBe(true);
    });

    it("should throw in ChooseBench if selections exceed bench space or have duplicates", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.bench = [
        createPokemonCard("Player1", "b1", "B1"),
        createPokemonCard("Player1", "b2", "B2"),
        createPokemonCard("Player1", "b3", "B3"),
        createPokemonCard("Player1", "b4", "B4"),
      ]; // Only 1 spot left
      p1.hand = [
        createPokemonCard("Player1", "h1", "H1"),
        createPokemonCard("Player1", "h2", "H2"),
      ];

      initialState.pendingPrompt = {
        id: "prompt-bench",
        playerId: "Player1",
        type: PromptType.ChooseBench,
        title: "Choose Bench",
        minSelections: 0,
        maxSelections: 5,
        allowPass: true,
        options: [],
      };

      // Exceeds space
      expect(() => {
        engine.respondToPrompt("Player1", {
          promptId: "prompt-bench",
          selections: ["h1", "h2"],
        });
      }).toThrow("Too many Pokemon selected for the bench");

      // Duplicates with enough space
      p1.bench = [];
      expect(() => {
        engine.respondToPrompt("Player1", {
          promptId: "prompt-bench",
          selections: ["h1", "h1"],
        });
      }).toThrow("Duplicate Pokemon selected for the bench");
    });

    it("should handle ChooseBench prompt successfully", () => {
      const engine = new GameEngine(initialState);
      const p1 = initialState.players["Player1"];
      p1.bench = [];
      const m1 = createPokemonCard("Player1", "b-mon-1", "Squirtle");
      const m2 = createPokemonCard("Player1", "b-mon-2", "Bulbasaur");
      p1.hand = [m1, m2];

      initialState.pendingPrompt = {
        id: "prompt-bench-ok",
        playerId: "Player1",
        type: PromptType.ChooseBench,
        title: "Choose Bench",
        minSelections: 0,
        maxSelections: 5,
        allowPass: true,
        options: [],
      };

      const events = engine.respondToPrompt("Player1", {
        promptId: "prompt-bench-ok",
        selections: ["b-mon-1", "b-mon-2"],
      });

      expect(p1.bench).toHaveLength(2);
      expect(p1.bench.map((b) => b.instanceId)).toEqual(["b-mon-1", "b-mon-2"]);
      expect(p1.hand).toHaveLength(0);
      expect(events.some((e) => e.type === "BENCH_UPDATED")).toBe(true);
    });
  });
});
