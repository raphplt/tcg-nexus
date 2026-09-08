import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildUserPrompt,
  getSystemPrompt,
  type CardInput,
} from "../src/prompt-builder.js";

describe("prompt-builder", () => {
  describe("getSystemPrompt", () => {
    it("should load the system prompt markdown", () => {
      const prompt = getSystemPrompt();
      assert.ok(typeof prompt === "string");
      assert.ok(
        prompt.includes("Tu es un parseur d'effets de cartes Pokémon TCG"),
      );
    });

    it("should return the cached system prompt on subsequent calls", () => {
      const prompt1 = getSystemPrompt();
      const prompt2 = getSystemPrompt();
      assert.equal(prompt1, prompt2);
    });
  });

  describe("buildUserPrompt", () => {
    it("should build a comprehensive Pokemon prompt", () => {
      const card: CardInput = {
        id: "sv3-1",
        name: "Dracaufeu",
        category: "Pokémon",
        types: ["Feu"],
        hp: 180,
        stage: "Niveau 2",
        retreat: 2,
        ability: {
          name: "Flamme Brasier",
          effect: "Attache 1 énergie Feu de la défausse.",
        },
        attacks: [
          {
            name: "Lance-Flammes",
            cost: ["Feu", "Incolore"],
            damage: 80,
            effect: "Défaussez une énergie Feu attachée.",
          },
        ],
      };

      const prompt = buildUserPrompt([card]);
      assert.ok(prompt.includes("CARTE POKÉMON:"));
      assert.ok(prompt.includes("ID: sv3-1"));
      assert.ok(prompt.includes("Nom: Dracaufeu"));
      assert.ok(prompt.includes("Type: Feu"));
      assert.ok(prompt.includes("PV: 180"));
      assert.ok(prompt.includes("Stade: Niveau 2"));
      assert.ok(prompt.includes("Coût de Retraite: 2"));
      assert.ok(prompt.includes('TALENT: "Flamme Brasier"'));
      assert.ok(
        prompt.includes('Texte: "Attache 1 énergie Feu de la défausse."'),
      );
      assert.ok(prompt.includes('ATTAQUE: "Lance-Flammes"'));
      assert.ok(prompt.includes("Coût: [Feu, Incolore]"));
      assert.ok(prompt.includes("Dégâts: 80"));
      assert.ok(
        prompt.includes('Texte: "Défaussez une énergie Feu attachée."'),
      );
    });

    it("should build a minimal Pokemon prompt with defaults", () => {
      const card: CardInput = {
        id: "sv3-2",
        name: "Magicarpe",
        category: "Pokémon",
      };

      const prompt = buildUserPrompt([card]);
      assert.ok(prompt.includes("CARTE POKÉMON:"));
      assert.ok(prompt.includes("Type: ?"));
      assert.ok(prompt.includes("PV: ?"));
      assert.ok(prompt.includes("Stade: De base"));
      assert.ok(!prompt.includes("Coût de Retraite:"));
      assert.ok(!prompt.includes("TALENT:"));
      assert.ok(!prompt.includes("ATTAQUE:"));
    });

    it("should build a Trainer prompt with defaults", () => {
      const card: CardInput = {
        id: "sv3-item",
        name: "Potion",
        category: "Dresseur",
        effect: "Soignez 30 dégâts à l'un de vos Pokémon.",
      };

      const prompt = buildUserPrompt([card]);
      assert.ok(prompt.includes("CARTE DRESSEUR:"));
      assert.ok(prompt.includes("ID: sv3-item"));
      assert.ok(prompt.includes("Nom: Potion"));
      assert.ok(prompt.includes("Sous-type: Objet"));
      assert.ok(
        prompt.includes('Texte: "Soignez 30 dégâts à l\'un de vos Pokémon."'),
      );
    });

    it("should filter out non-supported categories like Energy", () => {
      const card: CardInput = {
        id: "sv3-energy",
        name: "Énergie Plante",
        category: "Énergie",
      };

      const prompt = buildUserPrompt([card]);
      assert.equal(prompt, "");
    });

    it("should separate multiple cards with delimiter", () => {
      const card1: CardInput = {
        id: "c-1",
        name: "Bulbizarre",
        category: "Pokémon",
      };
      const card2: CardInput = {
        id: "c-2",
        name: "Potion",
        category: "Dresseur",
      };

      const prompt = buildUserPrompt([card1, card2]);
      assert.ok(prompt.includes("\n---\n\n"));
      assert.ok(prompt.includes("Nom: Bulbizarre"));
      assert.ok(prompt.includes("Nom: Potion"));
    });
  });
});
