import { describe, it, expect } from "vitest";
import {
  AnyEffectSchema,
  CardEffectsSchema,
  CardEffectsRegistrySchema,
} from "../src/schema.js";

describe("AnyEffectSchema", () => {
  it("should validate a DAMAGE effect", () => {
    const result = AnyEffectSchema.safeParse({
      type: "DAMAGE",
      amount: 30,
      target: "OPPONENT_ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("should validate a COIN_FLIP with nested effects", () => {
    const result = AnyEffectSchema.safeParse({
      type: "COIN_FLIP",
      onHeads: [
        {
          type: "APPLY_SPECIAL_CONDITION",
          condition: "Paralyzed",
          target: "OPPONENT_ACTIVE",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should validate a MULTI_COIN_FLIP", () => {
    const result = AnyEffectSchema.safeParse({
      type: "MULTI_COIN_FLIP",
      count: 4,
      perHeads: [
        { type: "DAMAGE", amount: 20, target: "OPPONENT_ACTIVE" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should validate DISCARD_ENERGY with ALL", () => {
    const result = AnyEffectSchema.safeParse({
      type: "DISCARD_ENERGY",
      amount: "ALL",
      target: "SELF",
      energyType: "Électrique",
    });
    expect(result.success).toBe(true);
  });

  it("should validate HEAL with ALL amount", () => {
    const result = AnyEffectSchema.safeParse({
      type: "HEAL",
      amount: "ALL",
      target: "SELF",
    });
    expect(result.success).toBe(true);
  });

  it("should validate SEARCH_DECK with filter", () => {
    const result = AnyEffectSchema.safeParse({
      type: "SEARCH_DECK",
      amount: 2,
      filter: {
        cardCategory: "Pokémon",
        pokemonStage: "De base",
      },
      destination: "BENCH",
      shuffleAfter: true,
    });
    expect(result.success).toBe(true);
  });

  it("should validate PREVENT_DAMAGE with duration", () => {
    const result = AnyEffectSchema.safeParse({
      type: "PREVENT_DAMAGE",
      target: "SELF",
      duration: "UNTIL_NEXT_OPPONENT_TURN",
    });
    expect(result.success).toBe(true);
  });

  it("should validate SHUFFLE_HAND_DRAW", () => {
    const result = AnyEffectSchema.safeParse({
      type: "SHUFFLE_HAND_DRAW",
      target: "BOTH",
      drawAmount: 4,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid effect type", () => {
    const result = AnyEffectSchema.safeParse({
      type: "FAKE_EFFECT",
      amount: 30,
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid target", () => {
    const result = AnyEffectSchema.safeParse({
      type: "DAMAGE",
      amount: 30,
      target: "INVALID_TARGET",
    });
    expect(result.success).toBe(false);
  });
});

describe("CardEffectsSchema", () => {
  it("should validate a pokemon card with attacks", () => {
    const result = CardEffectsSchema.safeParse({
      kind: "pokemon",
      attacks: {
        Sécrétion: {
          effects: [
            {
              type: "COIN_FLIP",
              onHeads: [
                {
                  type: "APPLY_SPECIAL_CONDITION",
                  condition: "Paralyzed",
                  target: "OPPONENT_ACTIVE",
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should validate a trainer card", () => {
    const result = CardEffectsSchema.safeParse({
      kind: "trainer",
      playEffects: [
        {
          type: "HEAL",
          amount: 30,
          target: "SELECTED_OWN_POKEMON",
        },
      ],
      targetStrategy: "OWN_POKEMON",
    });
    expect(result.success).toBe(true);
  });

  it("should validate pokemon with empty attack effects", () => {
    const result = CardEffectsSchema.safeParse({
      kind: "pokemon",
      attacks: {
        Charge: { effects: [] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should validate pokemon with ability", () => {
    const result = CardEffectsSchema.safeParse({
      kind: "pokemon",
      attacks: {},
      ability: {
        name: "Jus Fermenté",
        effects: [
          { type: "HEAL", amount: 10, target: "SELF" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("CardEffectsRegistrySchema", () => {
  it("should validate a registry with multiple cards", () => {
    const result = CardEffectsRegistrySchema.safeParse({
      "xy7-5": {
        kind: "pokemon",
        attacks: {
          Sécrétion: { effects: [] },
        },
      },
      "swsh4-185": {
        kind: "trainer",
        playEffects: [
          {
            type: "HEAL",
            amount: 60,
            target: "SELECTED_OWN_POKEMON",
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
