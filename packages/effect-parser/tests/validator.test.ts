import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkCoherence,
  validateCardEffects,
  validateRegistry,
} from "../src/validator.js";
import type { CardEffects } from "../src/schema.js";

describe("validateCardEffects", () => {
  it("validates a valid pokemon card effects payload", () => {
    const payload = {
      kind: "pokemon",
      attacks: {
        Thunderbolt: {
          effects: [
            {
              type: "DAMAGE",
              amount: 50,
              target: "OPPONENT_ACTIVE",
            },
          ],
        },
      },
    };

    const result = validateCardEffects(payload);
    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.kind, "pokemon");
  });

  it("returns error details when card effects payload is invalid", () => {
    const payload = {
      kind: "unknown_kind",
      attacks: "not-an-object",
    };

    const result = validateCardEffects(payload);
    assert.equal(result.success, false);
    assert.equal(result.data, undefined);
    assert.ok(typeof result.error === "string");
    assert.ok(result.error.length > 0);
  });
});

describe("validateRegistry", () => {
  it("validates a valid card registry dictionary", () => {
    const registry = {
      "base1-1": {
        kind: "pokemon",
        attacks: {
          Scratch: {
            effects: [
              { type: "DAMAGE", amount: 10, target: "OPPONENT_ACTIVE" },
            ],
          },
        },
      },
      "base1-2": {
        kind: "trainer",
        playEffects: [
          {
            type: "HEAL",
            amount: 20,
            target: "SELECTED_OWN_POKEMON",
          },
        ],
      },
    };

    const result = validateRegistry(registry);
    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(Object.keys(result.data).length, 2);
  });

  it("returns structured errors per card ID when registry has invalid entries", () => {
    const registry = {
      "bad-card-1": {
        kind: "pokemon",
        attacks: "invalid",
      },
      "bad-card-2": {
        kind: "unsupported",
      },
    };

    const result = validateRegistry(registry);
    assert.equal(result.success, false);
    assert.ok(Array.isArray(result.errors));
    assert.ok(result.errors.length >= 2);
    assert.ok(result.errors.some((e) => e.cardId === "bad-card-1"));
    assert.ok(result.errors.some((e) => e.cardId === "bad-card-2"));
  });
});

describe("checkCoherence", () => {
  it("returns a warning when damage to self exceeds 100", () => {
    const effects: CardEffects = {
      kind: "pokemon",
      attacks: {
        Overheat: {
          effects: [
            {
              type: "DAMAGE",
              amount: 120,
              target: "SELF",
            },
          ],
        },
      },
    };

    const warnings = checkCoherence("char-01", effects);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /DAMAGE to SELF with amount 120 seems high/);
  });

  it("returns a warning when healing targets opponent active pokemon", () => {
    const effects: CardEffects = {
      kind: "pokemon",
      attacks: {
        FriendlyWave: {
          effects: [
            {
              type: "HEAL",
              amount: 30,
              target: "OPPONENT_ACTIVE",
            },
          ],
        },
      },
    };

    const warnings = checkCoherence("chan-02", effects);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /HEAL targeting OPPONENT_ACTIVE is unusual/);
  });

  it("returns no warnings for standard coherent attacks", () => {
    const effects: CardEffects = {
      kind: "pokemon",
      attacks: {
        Tackle: {
          effects: [
            {
              type: "DAMAGE",
              amount: 30,
              target: "OPPONENT_ACTIVE",
            },
            {
              type: "DAMAGE",
              amount: 20,
              target: "SELF",
            },
          ],
        },
      },
    };

    const warnings = checkCoherence("normal-01", effects);
    assert.deepEqual(warnings, []);
  });

  it("returns no warnings for trainer cards", () => {
    const effects: CardEffects = {
      kind: "trainer",
      playEffects: [
        {
          type: "HEAL",
          amount: 50,
          target: "SELECTED_OWN_POKEMON",
        },
      ],
    };

    const warnings = checkCoherence("item-01", effects);
    assert.deepEqual(warnings, []);
  });
});
