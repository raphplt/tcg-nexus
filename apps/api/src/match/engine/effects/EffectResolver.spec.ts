import { GameEngine } from "../GameEngine";
import { GamePhase, TurnStep } from "../models/enums";
import { GameState } from "../models/GameState";
import {
  type AnyEffect,
  ApplySpecialConditionEffect,
  type BoostNextTurnDamageEffect,
  type CantAttackNextTurnEffect,
  type CoinFlipEffect,
  type ConditionalEffect,
  CountSource,
  DamageEffect,
  DrawCardEffect,
  type DynamicDamageEffect,
  EffectDuration,
  EffectType,
  type ExtraPrizeEffect,
  HealEffect,
  type MillEffect,
  type MultiCoinFlipEffect,
  type PlaceDamageCountersEffect,
  type PreventDamageEffect,
  type ReduceDamageEffect,
  type RemoveSpecialConditionEffect,
  type ReturnToHandEffect,
  type SendToLostZoneEffect,
  type ShuffleDeckEffect,
  type ShuffleHandDrawEffect,
  type ShuffleIntoDeckEffect,
  TargetType,
  type TrainerLockEffect,
} from "./Effect";
import { EffectResolver } from "./EffectResolver";

describe("EffectResolver", () => {
  let initialState: GameState;
  let engine: GameEngine;
  let resolver: EffectResolver;

  beforeEach(() => {
    initialState = {
      id: "test-match-effects",
      players: {
        Player1: {
          playerId: "Player1",
          name: "Ash",
          deck: [],
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: {
            instanceId: "p1-active",
            ownerId: "Player1",
            damageCounters: 50,
            specialConditions: [],
            attachedEnergies: [],
            attachedTools: [],
            attachedEvolutions: [],
            turnsInPlay: 1,
            temporaryEffects: [],
            usedOncePerGameAttacks: [],
            baseCard: {
              id: "test-mon-1",
              name: "Pikachu",
              category: "Pokémon",
              hp: 60,
            } as any,
          },
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          playerEffects: [],
        },
        Player2: {
          playerId: "Player2",
          name: "Gary",
          deck: [
            {
              instanceId: "deck-1",
              ownerId: "Player2",
              baseCard: {
                id: "e1",
                name: "Energy",
                category: "Énergie",
              } as any,
            },
            {
              instanceId: "deck-2",
              ownerId: "Player2",
              baseCard: {
                id: "e2",
                name: "Energy",
                category: "Énergie",
              } as any,
            },
          ],
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: {
            instanceId: "p2-active",
            ownerId: "Player2",
            damageCounters: 0,
            specialConditions: [],
            attachedEnergies: [],
            attachedTools: [],
            attachedEvolutions: [],
            turnsInPlay: 1,
            temporaryEffects: [],
            usedOncePerGameAttacks: [],
            baseCard: {
              id: "test-mon-2",
              name: "Squirtle",
              category: "Pokémon",
              hp: 60,
            } as any,
          },
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          playerEffects: [],
        },
      },
      playerIds: ["Player1", "Player2"],
      activePlayerId: "Player1",
      turnNumber: 1,
      gamePhase: GamePhase.Play,
      turnStep: TurnStep.Main,
      stadium: null,
      winnerId: null,
      winnerReason: null,
      firstPlayerId: null,
      rngState: 12345,
      pendingTurnTransitionToPlayerId: null,
      pendingPrompt: null,
      setup: null,
      resumeAction: null,
      pendingTrainerPlay: null,
      pendingEffectAction: null,
      globalEffects: [],
      pendingExtraPrizes: {},
    } as GameState;

    engine = new GameEngine(initialState);
    resolver = new EffectResolver(engine);
  });

  it("should apply DAMAGE to opponent active", () => {
    const events: any[] = [];
    const dmgEffect: DamageEffect = {
      type: EffectType.DAMAGE,
      amount: 30,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([dmgEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player2"].active!.damageCounters).toBe(30);
    expect(
      events.some((e) => e.type === "DAMAGE_DEALT" && e.amount === 30),
    ).toBe(true);
  });

  it("should apply HEAL to self active", () => {
    const events: any[] = [];
    const healEffect: HealEffect = {
      type: EffectType.HEAL,
      amount: 40,
      target: TargetType.SELF,
    };

    resolver.resolveEffects([healEffect], "Player1", events);

    const state = engine.getState();
    // P1 active starts with 50 damage
    expect(state.players["Player1"].active!.damageCounters).toBe(10);
    expect(events.some((e) => e.type === "HEALED" && e.amount === 40)).toBe(
      true,
    );
  });

  it("should cap HEAL at 0 damage", () => {
    const events: any[] = [];
    const healEffect: HealEffect = {
      type: EffectType.HEAL,
      amount: 100,
      target: TargetType.SELF,
    };

    resolver.resolveEffects([healEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player1"].active!.damageCounters).toBe(0);
  });

  it("should DRAW_CARD for the current player", () => {
    const events: any[] = [];
    const drawEffect: DrawCardEffect = {
      type: EffectType.DRAW_CARD,
      amount: 2,
    };

    resolver.resolveEffects([drawEffect], "Player2", events);

    const state = engine.getState();
    expect(state.players["Player2"].hand.length).toBe(2);
    expect(state.players["Player2"].deck.length).toBe(0);
    expect(events.filter((e) => e.type === "CARD_DRAWN").length).toBe(2);
  });

  it("should apply SPECIAL_CONDITION to opponent", () => {
    const events: any[] = [];
    const condEffect: ApplySpecialConditionEffect = {
      type: EffectType.APPLY_SPECIAL_CONDITION,
      condition: "Paralyzed",
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([condEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player2"].active!.specialConditions).toContain(
      "Paralyzed",
    );
    expect(events.some((e) => e.type === "SPECIAL_CONDITION_APPLIED")).toBe(
      true,
    );
  });

  it("should HEAL with amount=ALL and clear special conditions", () => {
    const events: any[] = [];
    initialState.players["Player1"].active!.specialConditions = [
      "Burned" as any,
      "Asleep" as any,
    ];

    const healEffect: HealEffect = {
      type: EffectType.HEAL,
      amount: "ALL",
      target: TargetType.SELF,
      removeSpecialConditions: true,
    };

    resolver.resolveEffects([healEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player1"].active!.damageCounters).toBe(0);
    expect(state.players["Player1"].active!.specialConditions).toEqual([]);
  });

  it("should PLACE_DAMAGE_COUNTERS bypassing weakness/resistance flow", () => {
    const events: any[] = [];
    const placeEffect: PlaceDamageCountersEffect = {
      type: EffectType.PLACE_DAMAGE_COUNTERS,
      amount: 30,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([placeEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player2"].active!.damageCounters).toBe(30);
    expect(events.some((e) => e.type === "DAMAGE_COUNTERS_PLACED")).toBe(true);
  });

  it("should compute DYNAMIC_DAMAGE based on attached energy count", () => {
    const events: any[] = [];
    initialState.players["Player1"].active!.attachedEnergies = [
      {
        instanceId: "e1",
        ownerId: "Player1",
        baseCard: {
          id: "ene-1",
          name: "Energy",
          category: "Énergie",
          provides: ["Feu"],
        } as any,
      },
      {
        instanceId: "e2",
        ownerId: "Player1",
        baseCard: {
          id: "ene-2",
          name: "Energy",
          category: "Énergie",
          provides: ["Feu"],
        } as any,
      },
    ];

    const dynEffect: DynamicDamageEffect = {
      type: EffectType.DYNAMIC_DAMAGE,
      amountPerUnit: 20,
      countSource: CountSource.ENERGY_ON_SELF,
      target: TargetType.OPPONENT_ACTIVE,
      operator: "+",
    };

    resolver.resolveEffects([dynEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player2"].active!.damageCounters).toBe(40);
    expect(events.some((e) => e.type === "DYNAMIC_DAMAGE_DEALT")).toBe(true);
  });

  it("should REMOVE_SPECIAL_CONDITION (specific) but leave others", () => {
    const events: any[] = [];
    initialState.players["Player1"].active!.specialConditions = [
      "Burned" as any,
      "Asleep" as any,
    ];

    const effect: RemoveSpecialConditionEffect = {
      type: EffectType.REMOVE_SPECIAL_CONDITION,
      condition: "Burned",
      target: TargetType.SELF,
    };

    resolver.resolveEffects([effect], "Player1", events);

    expect(initialState.players["Player1"].active!.specialConditions).toEqual([
      "Asleep",
    ]);
  });

  it("should REMOVE_SPECIAL_CONDITION (all) when no condition specified", () => {
    const events: any[] = [];
    initialState.players["Player1"].active!.specialConditions = [
      "Burned" as any,
      "Confused" as any,
    ];

    const effect: RemoveSpecialConditionEffect = {
      type: EffectType.REMOVE_SPECIAL_CONDITION,
      target: TargetType.SELF,
    };

    resolver.resolveEffects([effect], "Player1", events);
    expect(initialState.players["Player1"].active!.specialConditions).toEqual(
      [],
    );
  });

  it("should MILL N cards from opponent deck top to discard", () => {
    const events: any[] = [];
    const millEffect: MillEffect = {
      type: EffectType.MILL,
      amount: 2,
      target: "OPPONENT",
    };

    resolver.resolveEffects([millEffect], "Player1", events);

    const state = engine.getState();
    expect(state.players["Player2"].deck.length).toBe(0);
    expect(state.players["Player2"].discard.length).toBe(2);
    expect(events.some((e) => e.type === "CARDS_MILLED")).toBe(true);
  });

  it("should SHUFFLE_HAND_DRAW: clear hand, shuffle into deck, draw N", () => {
    const events: any[] = [];
    initialState.players["Player2"].hand = [
      {
        instanceId: "h1",
        ownerId: "Player2",
        baseCard: { id: "h", name: "InHand", category: "Pokémon" } as any,
      },
    ];

    const effect: ShuffleHandDrawEffect = {
      type: EffectType.SHUFFLE_HAND_DRAW,
      target: "OPPONENT",
      drawAmount: 2,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2 = engine.getState().players["Player2"];
    expect(p2.hand.length).toBe(2);
    expect(p2.deck.length).toBe(1);
    expect(events.some((e) => e.type === "HAND_SHUFFLED_AND_DREW")).toBe(true);
  });

  it("should RETURN_TO_HAND: move opponent active to its hand", () => {
    const events: any[] = [];
    const effect: ReturnToHandEffect = {
      type: EffectType.RETURN_TO_HAND,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2 = engine.getState().players["Player2"];
    expect(p2.active).toBeNull();
    expect(p2.hand.some((c) => c.instanceId === "p2-active")).toBe(true);
  });

  it("should SHUFFLE_INTO_DECK: send active back into owner deck", () => {
    const events: any[] = [];
    const effect: ShuffleIntoDeckEffect = {
      type: EffectType.SHUFFLE_INTO_DECK,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2 = engine.getState().players["Player2"];
    expect(p2.active).toBeNull();
    expect(p2.deck.some((c) => c.instanceId === "p2-active")).toBe(true);
  });

  it("should SHUFFLE_DECK and emit DECK_SHUFFLED", () => {
    const events: any[] = [];
    const effect: ShuffleDeckEffect = { type: EffectType.SHUFFLE_DECK };

    resolver.resolveEffects([effect], "Player2", events);

    expect(events.some((e) => e.type === "DECK_SHUFFLED")).toBe(true);
  });

  it("should SEND_TO_LOST_ZONE: move opponent active to lostZone", () => {
    const events: any[] = [];
    const effect: SendToLostZoneEffect = {
      type: EffectType.SEND_TO_LOST_ZONE,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2 = engine.getState().players["Player2"];
    expect(p2.active).toBeNull();
    expect(p2.lostZone.some((c) => c.instanceId === "p2-active")).toBe(true);
    expect(events.some((e) => e.type === "SENT_TO_LOST_ZONE")).toBe(true);
  });

  it("should EXTRA_PRIZE: increment pendingExtraPrizes for source", () => {
    const events: any[] = [];
    const effect: ExtraPrizeEffect = {
      type: EffectType.EXTRA_PRIZE,
      amount: 1,
    };

    resolver.resolveEffects([effect], "Player1", events);

    expect(engine.getState().pendingExtraPrizes["Player1"]).toBe(1);
    expect(events.some((e) => e.type === "EXTRA_PRIZE_MARKED")).toBe(true);
  });

  it("should PREVENT_DAMAGE: add temporary PREVENT_DAMAGE to target", () => {
    const events: any[] = [];
    const effect: PreventDamageEffect = {
      type: EffectType.PREVENT_DAMAGE,
      target: TargetType.SELF,
      duration: EffectDuration.UNTIL_NEXT_OPPONENT_TURN,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p1Active = engine.getState().players["Player1"].active!;
    expect(
      p1Active.temporaryEffects.some((t) => t.type === "PREVENT_DAMAGE"),
    ).toBe(true);
  });

  it("should REDUCE_DAMAGE: add temporary REDUCE_DAMAGE with amount", () => {
    const events: any[] = [];
    const effect: ReduceDamageEffect = {
      type: EffectType.REDUCE_DAMAGE,
      amount: 30,
      target: TargetType.SELF,
      duration: EffectDuration.UNTIL_NEXT_OPPONENT_TURN,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p1Active = engine.getState().players["Player1"].active!;
    const reduce = p1Active.temporaryEffects.find(
      (t) => t.type === "REDUCE_DAMAGE",
    );
    expect(reduce).toBeDefined();
    expect(reduce?.amount).toBe(30);
  });

  it("should BOOST_NEXT_TURN_DAMAGE: attach BOOST_DAMAGE to source active", () => {
    const events: any[] = [];
    const effect: BoostNextTurnDamageEffect = {
      type: EffectType.BOOST_NEXT_TURN_DAMAGE,
      amount: 20,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p1Active = engine.getState().players["Player1"].active!;
    const boost = p1Active.temporaryEffects.find(
      (t) => t.type === "BOOST_DAMAGE",
    );
    expect(boost).toBeDefined();
    expect(boost?.amount).toBe(20);
  });

  it("should CANT_ATTACK_NEXT_TURN: attach CANT_ATTACK to selected target", () => {
    const events: any[] = [];
    const effect: CantAttackNextTurnEffect = {
      type: EffectType.CANT_ATTACK_NEXT_TURN,
      target: TargetType.OPPONENT_ACTIVE,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2Active = engine.getState().players["Player2"].active!;
    expect(
      p2Active.temporaryEffects.some((t) => t.type === "CANT_ATTACK"),
    ).toBe(true);
  });

  it("should TRAINER_LOCK: register player effect on opponent", () => {
    const events: any[] = [];
    const effect: TrainerLockEffect = {
      type: EffectType.TRAINER_LOCK,
      lockType: "ITEM",
      duration: EffectDuration.UNTIL_NEXT_OPPONENT_TURN,
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2 = engine.getState().players["Player2"];
    expect(
      p2.playerEffects.some(
        (e) => e.type === "TRAINER_LOCK" && e.lockType === "ITEM",
      ),
    ).toBe(true);
    expect(events.some((e) => e.type === "PLAYER_EFFECT_APPLIED")).toBe(true);
  });

  it("should resolve COIN_FLIP onHeads OR onTails branch deterministically", () => {
    const events: any[] = [];
    const effect: CoinFlipEffect = {
      type: EffectType.COIN_FLIP,
      onHeads: [
        {
          type: EffectType.DAMAGE,
          amount: 50,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
      onTails: [
        {
          type: EffectType.DAMAGE,
          amount: 10,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2Active = engine.getState().players["Player2"].active!;
    // Either branch must have applied damage; combined with deterministic RNG
    // (rngState=12345 → first nextRandom()<0.5 → tails) we expect 10.
    expect([10, 50]).toContain(p2Active.damageCounters);
    expect(p2Active.damageCounters).toBe(10);
    expect(events.some((e) => e.type === "COIN_FLIPPED")).toBe(true);
  });

  it("should resolve MULTI_COIN_FLIP and apply perHeads N times", () => {
    const events: any[] = [];
    const effect: MultiCoinFlipEffect = {
      type: EffectType.MULTI_COIN_FLIP,
      count: 4,
      perHeads: [
        {
          type: EffectType.DAMAGE,
          amount: 10,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
    };

    resolver.resolveEffects([effect], "Player1", events);

    const p2Active = engine.getState().players["Player2"].active!;
    const flips = events.filter((e) => e.type === "COIN_FLIPPED");
    const headsCount = flips.filter((e) => e.result === "HEADS").length;
    expect(flips.length).toBe(4);
    expect(p2Active.damageCounters).toBe(headsCount * 10);
  });

  it("should resolve CONDITIONAL: apply thenEffects when condition met", () => {
    const events: any[] = [];
    initialState.players["Player2"].active!.specialConditions = [
      "Poisoned" as any,
    ];

    const effect: ConditionalEffect = {
      type: EffectType.CONDITIONAL,
      condition: { type: "IF_OPPONENT_POISONED" },
      thenEffects: [
        {
          type: EffectType.DAMAGE,
          amount: 60,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
      elseEffects: [
        {
          type: EffectType.DAMAGE,
          amount: 10,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
    };

    resolver.resolveEffects([effect], "Player1", events);

    expect(engine.getState().players["Player2"].active!.damageCounters).toBe(
      60,
    );
  });

  it("should resolve CONDITIONAL: fall back to elseEffects when condition fails", () => {
    const events: any[] = [];
    // P2 active has no special conditions → IF_OPPONENT_POISONED is false
    const effect: ConditionalEffect = {
      type: EffectType.CONDITIONAL,
      condition: { type: "IF_OPPONENT_POISONED" },
      thenEffects: [
        {
          type: EffectType.DAMAGE,
          amount: 60,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
      elseEffects: [
        {
          type: EffectType.DAMAGE,
          amount: 10,
          target: TargetType.OPPONENT_ACTIVE,
        } as DamageEffect,
      ],
    };

    resolver.resolveEffects([effect], "Player1", events);

    expect(engine.getState().players["Player2"].active!.damageCounters).toBe(
      10,
    );
  });

  it("should warn when an unknown effect type reaches the resolver", () => {
    const events: any[] = [];
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const unknown: AnyEffect = { type: "BOGUS_TYPE" } as unknown as AnyEffect;
    resolver.resolveEffects([unknown], "Player1", events);

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("Stadium passive effects (calculateAttackDamage)", () => {
  let initialState: GameState;
  let engine: GameEngine;

  function buildState(stadiumPassives?: AnyEffect[]): GameState {
    return {
      id: "test-stadium",
      players: {
        Player1: {
          playerId: "Player1",
          name: "Ash",
          deck: [],
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: {
            instanceId: "p1-active",
            ownerId: "Player1",
            damageCounters: 0,
            specialConditions: [],
            attachedEnergies: [
              {
                instanceId: "e1",
                ownerId: "Player1",
                baseCard: {
                  id: "ene-fire",
                  name: "Feu",
                  category: "Énergie",
                  provides: ["Feu"],
                } as any,
              },
            ],
            attachedTools: [],
            attachedEvolutions: [],
            turnsInPlay: 2,
            temporaryEffects: [],
            usedOncePerGameAttacks: [],
            baseCard: {
              id: "fire-mon",
              name: "Salameche",
              category: "Pokémon",
              hp: 100,
              types: ["Feu"],
              stage: "De base",
              attacks: [
                {
                  name: "Crachefeu",
                  cost: ["Feu"],
                  damage: 30,
                },
              ],
            } as any,
          },
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          playerEffects: [],
        },
        Player2: {
          playerId: "Player2",
          name: "Gary",
          deck: [
            {
              instanceId: "p2-deck-fill",
              ownerId: "Player2",
              baseCard: { id: "x", name: "x", category: "Pokémon" } as any,
            },
          ],
          hand: [],
          discard: [],
          lostZone: [],
          prizes: [],
          active: {
            instanceId: "p2-active",
            ownerId: "Player2",
            damageCounters: 0,
            specialConditions: [],
            attachedEnergies: [],
            attachedTools: [],
            attachedEvolutions: [],
            turnsInPlay: 1,
            temporaryEffects: [],
            usedOncePerGameAttacks: [],
            baseCard: {
              id: "water-mon",
              name: "Carapuce",
              category: "Pokémon",
              hp: 60,
              types: ["Eau"],
              stage: "De base",
              attacks: [],
            } as any,
          },
          bench: [],
          hasPlayedSupporterThisTurn: false,
          hasRetreatedThisTurn: false,
          hasAttachedEnergyThisTurn: false,
          prizeCardsTaken: 0,
          playerEffects: [],
        },
      },
      playerIds: ["Player1", "Player2"],
      activePlayerId: "Player1",
      turnNumber: 2,
      gamePhase: GamePhase.Play,
      turnStep: TurnStep.Main,
      stadium: stadiumPassives
        ? {
            instanceId: "stadium-1",
            ownerId: "Player1",
            baseCard: {
              id: "stadium-card",
              name: "Champ d'entraînement",
              category: "Dresseur",
              trainerType: "Stade",
              effect: "passive",
              passiveEffects: stadiumPassives,
            } as any,
          }
        : null,
      winnerId: null,
      winnerReason: null,
      firstPlayerId: null,
      rngState: 12345,
      pendingTurnTransitionToPlayerId: null,
      pendingPrompt: null,
      setup: null,
      resumeAction: null,
      pendingTrainerPlay: null,
      pendingEffectAction: null,
      globalEffects: [],
      pendingExtraPrizes: {},
    } as GameState;
  }

  beforeEach(() => {
    initialState = buildState();
    engine = new GameEngine(initialState);
  });

  it("baseline: no stadium → defender takes attack damage = 30", () => {
    const events = engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(initialState.players["Player2"].active!.damageCounters).toBe(30);
    expect(events.some((e) => e.type === "ATTACK_USED")).toBe(true);
  });

  it("STADIUM_PASSIVE_DAMAGE_BOOST adds amount when attacker matches type", () => {
    initialState = buildState([
      {
        type: EffectType.STADIUM_PASSIVE_DAMAGE_BOOST,
        amount: 20,
        pokemonType: "Feu",
      },
    ]);
    engine = new GameEngine(initialState);

    engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(initialState.players["Player2"].active!.damageCounters).toBe(50);
  });

  it("STADIUM_PASSIVE_DAMAGE_BOOST does NOT apply when attacker type mismatches", () => {
    initialState = buildState([
      {
        type: EffectType.STADIUM_PASSIVE_DAMAGE_BOOST,
        amount: 20,
        pokemonType: "Eau",
      },
    ]);
    engine = new GameEngine(initialState);

    engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(initialState.players["Player2"].active!.damageCounters).toBe(30);
  });

  it("STADIUM_PASSIVE_DAMAGE_REDUCE subtracts amount when defender matches", () => {
    initialState = buildState([
      {
        type: EffectType.STADIUM_PASSIVE_DAMAGE_REDUCE,
        amount: 10,
        pokemonType: "Eau",
      },
    ]);
    engine = new GameEngine(initialState);

    engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(initialState.players["Player2"].active!.damageCounters).toBe(20);
  });

  it("STADIUM_PASSIVE_DAMAGE_REDUCE clamps at 0 (never negative)", () => {
    initialState = buildState([
      {
        type: EffectType.STADIUM_PASSIVE_DAMAGE_REDUCE,
        amount: 9999,
      },
    ]);
    engine = new GameEngine(initialState);

    engine.dispatch({
      playerId: "Player1",
      type: "ATTACK" as any,
      payload: { attackIndex: 0 },
    });

    expect(initialState.players["Player2"].active!.damageCounters).toBe(0);
  });
});
