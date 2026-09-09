import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RuleBasedParser } from "../src/rule-based-parser.js";
import type { CardInput } from "../src/prompt-builder.js";

describe("RuleBasedParser", () => {
  const parser = new RuleBasedParser();

  it("parses a coin flip attack that paralyzes the opponent", () => {
    const card: CardInput = {
      id: "xy7-5",
      name: "Aspicot",
      category: "Pokémon",
      attacks: [
        {
          name: "Sécrétion",
          effect:
            "Lancez une pièce. Si c'est face, le Pokémon Actif de votre adversaire est maintenant Paralysé.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    assert.equal(res.effects?.kind, "pokemon");
    const attackEffects = res.effects?.attacks?.["Sécrétion"]?.effects;
    assert.ok(attackEffects && attackEffects.length > 0);
    assert.equal(attackEffects[0]?.type, "COIN_FLIP");
  });

  it("parses a direct status condition attack (Poison)", () => {
    const card: CardInput = {
      id: "base-1",
      name: "Abo",
      category: "Pokémon",
      attacks: [
        {
          name: "Morsure Venin",
          effect:
            "Le Pokémon Actif de votre adversaire est maintenant Empoisonné.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Morsure Venin"]?.effects;
    assert.ok(effects && effects.length > 0);
    assert.equal(effects[0]?.type, "APPLY_SPECIAL_CONDITION");
    assert.equal(effects[0]?.condition, "Poisoned");
  });

  it("parses healing attack effects", () => {
    const card: CardInput = {
      id: "card-heal",
      name: "Leveinard",
      category: "Pokémon",
      attacks: [
        {
          name: "Soin Doux",
          effect: "Soignez 30 dégâts de ce Pokémon.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Soin Doux"]?.effects;
    assert.ok(effects && effects.length > 0);
    assert.equal(effects[0]?.type, "HEAL");
    assert.equal(effects[0]?.amount, 30);
  });

  it("parses card drawing attack effects", () => {
    const card: CardInput = {
      id: "card-draw",
      name: "Kangourex",
      category: "Pokémon",
      attacks: [
        {
          name: "Appel",
          effect: "Piochez 2 cartes.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Appel"]?.effects;
    assert.ok(effects && effects.length > 0);
    assert.equal(effects[0]?.type, "DRAW_CARD");
    assert.equal(effects[0]?.amount, 2);
  });

  it("parses a trainer card with heal effects and target strategy", () => {
    const card: CardInput = {
      id: "swsh4-185",
      name: "Potion",
      category: "Dresseur",
      trainerType: "Item",
      effect: "Soignez 30 dégâts à l'un de vos Pokémon.",
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    assert.equal(res.effects?.kind, "trainer");
    assert.equal(res.effects?.targetStrategy, "OWN_POKEMON");
    const playEffects = res.effects?.playEffects;
    assert.ok(playEffects && playEffects.length > 0);
    assert.equal(playEffects[0]?.type, "HEAL");
    assert.equal(playEffects[0]?.amount, 30);
  });

  it("parses batches of cards asynchronously", async () => {
    const cards: CardInput[] = [
      {
        id: "c1",
        name: "Pikachu",
        category: "Pokémon",
        attacks: [{ name: "Charge", effect: "" }],
      },
      {
        id: "c2",
        name: "Salameche",
        category: "Pokémon",
        attacks: [{ name: "Flammèche", effect: "" }],
      },
    ];

    const results = await parser.parseBatch(cards);
    assert.equal(results.length, 2);
    assert.equal(results[0]?.success, true);
    assert.equal(results[1]?.success, true);
  });

  it("parses self damage and opponent bench damage", () => {
    const card: CardInput = {
      id: "card-dmg-recoil",
      name: "Electrode",
      category: "Pokémon",
      attacks: [
        {
          name: "Explosion",
          effect:
            "Ce Pokémon s'inflige 30 dégâts. Cette attaque inflige 10 dégâts à chacun des Pokémon de banc adverses.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Explosion"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "DAMAGE" && e.target === "SELF"));
    assert.ok(
      effects.some(
        (e) => e.type === "DAMAGE" && e.target === "ALL_OPPONENT_BENCH",
      ),
    );
  });

  it("parses discard energy effect", () => {
    const card: CardInput = {
      id: "card-discard",
      name: "Dracaufeu",
      category: "Pokémon",
      attacks: [
        {
          name: "Lance-Flammes",
          effect: "Défaussez une Énergie attachée à ce Pokémon.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Lance-Flammes"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "DISCARD_ENERGY"));
  });

  it("parses search deck effect", () => {
    const card: CardInput = {
      id: "card-search",
      name: "Pikachu",
      category: "Pokémon",
      attacks: [
        {
          name: "Appel aux Amis",
          effect:
            "Cherchez dans votre deck un Pokémon de base et placez-le sur votre banc. Mélangez ensuite votre deck.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Appel aux Amis"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "SEARCH_DECK"));
  });

  it("parses prevent damage effect", () => {
    const card: CardInput = {
      id: "card-prevent",
      name: "Onix",
      category: "Pokémon",
      attacks: [
        {
          name: "Armure",
          effect:
            "Pendant le prochain tour de votre adversaire, ce Pokémon ne subit aucun dégât.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Armure"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "PREVENT_DAMAGE"));
  });

  it("parses switch pokemon effect", () => {
    const card: CardInput = {
      id: "card-switch",
      name: "Doduo",
      category: "Pokémon",
      attacks: [
        {
          name: "Repli Rapide",
          effect:
            "Échangez votre Pokémon Actif avec l'un de vos Pokémon de banc.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Repli Rapide"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "SWITCH_OWN_ACTIVE"));
  });

  it("parses remove special condition effect", () => {
    const card: CardInput = {
      id: "card-cure",
      name: "Stari",
      category: "Pokémon",
      attacks: [
        {
          name: "Régénération",
          effect: "Ce Pokémon guérit toutes les altérations de statut.",
        },
      ],
    };

    const res = parser.parseCard(card);
    assert.equal(res.success, true);
    const effects = res.effects?.attacks?.["Régénération"]?.effects ?? [];
    assert.ok(effects.some((e) => e.type === "REMOVE_SPECIAL_CONDITION"));
  });
});
