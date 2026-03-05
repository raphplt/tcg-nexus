import { GameEngine } from "../GameEngine";
import { GamePhase, TurnStep } from "../models/enums";
import { GameState } from "../models/GameState";
import {
  ApplySpecialConditionEffect,
  DamageEffect,
  DrawCardEffect,
  EffectType,
  HealEffect,
  TargetType,
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
});
