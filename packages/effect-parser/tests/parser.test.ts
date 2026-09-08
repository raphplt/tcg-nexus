import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EffectParser } from "../src/parser.js";
import type { LLMProvider } from "../src/providers/base.js";
import type { CardInput } from "../src/prompt-builder.js";

class MockProvider implements LLMProvider {
  name = "mock";
  public responses: (string | Error)[] = [];
  public callCount = 0;
  public receivedPrompts: { system: string; user: string }[] = [];

  constructor(responses: (string | Error)[]) {
    this.responses = [...responses];
  }

  async generateJSON(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    this.callCount++;
    this.receivedPrompts.push({ system: systemPrompt, user: userPrompt });
    const next = this.responses.shift();
    if (next instanceof Error) {
      throw next;
    }
    if (typeof next !== "string") {
      throw new Error("No response available in mock");
    }
    return next;
  }
}

describe("EffectParser", () => {
  const sampleCard: CardInput = {
    id: "pikachu-1",
    name: "Pikachu",
    category: "Pokémon",
    types: ["Électrique"],
    attacks: [
      {
        name: "Éclair",
        cost: ["Électrique"],
        damage: 20,
      },
    ],
  };

  const validOutput = JSON.stringify({
    "pikachu-1": {
      kind: "pokemon",
      attacks: {
        Éclair: {
          effects: [],
        },
      },
    },
  });

  it("should parse a valid card response successfully", async () => {
    const provider = new MockProvider([validOutput]);
    const parser = new EffectParser({ provider, maxRetries: 2 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.cardId, "pikachu-1");
    assert.equal(result.success, true);
    assert.ok(result.effects);
    assert.equal(result.effects?.kind, "pokemon");
    assert.ok(result.effects?.attacks?.["Éclair"]);
    assert.equal(provider.callCount, 1);
  });

  it("should retry when provider throws and succeed on next attempt", async () => {
    const provider = new MockProvider([
      new Error("Network timeout"),
      validOutput,
    ]);
    const parser = new EffectParser({ provider, maxRetries: 2 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.success, true);
    assert.equal(provider.callCount, 2);
    assert.ok(
      provider.receivedPrompts[1].user.includes("L'essai précédent a échoué"),
    );
  });

  it("should retry when response is invalid JSON syntax", async () => {
    const provider = new MockProvider(["NOT_VALID_JSON", validOutput]);
    const parser = new EffectParser({ provider, maxRetries: 2 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.success, true);
    assert.equal(provider.callCount, 2);
  });

  it("should return failure when maxRetries are exhausted", async () => {
    const provider = new MockProvider([
      new Error("Fail 1"),
      new Error("Fail 2"),
      new Error("Fail 3"),
    ]);
    const parser = new EffectParser({ provider, maxRetries: 2 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Failed after 3 attempts"));
    assert.equal(provider.callCount, 3);
  });

  it("should return failure if cardId is not in response object", async () => {
    const output = JSON.stringify({
      "other-card": { kind: "pokemon", attacks: {} },
    });

    const provider = new MockProvider([output]);
    const parser = new EffectParser({ provider, maxRetries: 1 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.success, false);
    assert.equal(result.error, "Card pikachu-1 not found in response");
  });

  it("should return validation error if card data does not match schema", async () => {
    const output = JSON.stringify({
      "pikachu-1": {
        kind: "pokemon",
        attacks: {
          Éclair: {
            effects: [{ type: "NON_EXISTENT_EFFECT" }],
          },
        },
      },
    });

    const provider = new MockProvider([output]);
    const parser = new EffectParser({ provider, maxRetries: 1 });

    const result = await parser.parseCard(sampleCard);
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});
