/**
 * Composition of English sealed-product names.
 *
 * Run with `npm test` in apps/fetch. The dictionaries are read from the real
 * dataset: these tests also guard the join between the Pokécardex series codes
 * and the TCGdex sets.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import {
  composeSealedName,
  loadSealedNameSources,
  type RawSealedProduct,
  type SealedNameSources,
} from "./sealed-names.js";

let sources: SealedNameSources;

before(() => {
  sources = loadSealedNameSources();
});

function product(
  overrides: Partial<RawSealedProduct> & { name: string },
): RawSealedProduct {
  return {
    id: "test-product",
    pokecardexSeriesId: "JTG",
    setName: "Aventures Ensemble",
    productType: "booster",
    image: "sealed/test.png",
    imageFilename: "test.png",
    ...overrides,
  };
}

describe("composeSealedName", () => {
  test("compose le nom du set traduit et le terme traduit", () => {
    const composed = composeSealedName(
      product({ name: "Aventures Ensemble - Coffret Dresseur" }),
      sources,
    );

    assert.equal(composed.en, "Journey Together - Booster Bundle");
  });

  test("ne modifie jamais le nom français", () => {
    const french = "Aventures Ensemble - Coffret Dresseur";
    const composed = composeSealedName(product({ name: french }), sources);

    assert.equal(composed.fr, french);
  });

  test("place le nom du Pokémon avant le terme, comme en anglais", () => {
    const composed = composeSealedName(
      product({
        pokecardexSeriesId: "FLF",
        setName: "Étincelles",
        name: "Étincelles - Booster Dracaufeu",
      }),
      sources,
    );

    assert.equal(composed.en, "Flashfire - Charizard Booster Pack");
  });

  test("garde l'index de variante après le terme", () => {
    const composed = composeSealedName(
      product({ name: "Aventures Ensemble - Booster 3" }),
      sources,
    );

    assert.equal(composed.en, "Journey Together - Booster Pack 3");
  });

  test("ne découpe pas un terme qui se termine par un chiffre", () => {
    const composed = composeSealedName(
      product({ name: "Aventures Ensemble - 2x 2" }),
      sources,
    );

    assert.equal(composed.en, "Journey Together - 2x2 Portfolio");
  });

  test("traduit un nom libre réduit à un nom de Pokémon", () => {
    const composed = composeSealedName(
      product({ name: "Dracolosse", setName: "Aventures Ensemble" }),
      sources,
    );

    assert.equal(composed.en, "Dragonite");
  });

  test("laisse sans nom anglais un nom de deck non dérivable", () => {
    const composed = composeSealedName(
      product({ name: "Envolée Orageuse", setName: "Poing de Fusion" }),
      sources,
    );

    assert.equal(composed.en, null);
    assert.equal(composed.skipped, "label");
  });

  test("laisse sans nom anglais un produit dont le set n'existe pas chez TCGdex", () => {
    const composed = composeSealedName(
      product({
        pokecardexSeriesId: "WC23",
        setName: "World Championships 2023",
        name: "World Championships 2023 - Booster",
      }),
      sources,
    );

    assert.equal(composed.en, null);
    assert.equal(composed.skipped, "set");
  });

  test("résout un code de série que le nom du set ne permettait pas de retrouver", () => {
    // Pokécardex écrit "Diamant & Perle : Tempête" là où TCGdex dit
    // "Stormfront" : seul le code de série permet la jointure.
    const composed = composeSealedName(
      product({
        pokecardexSeriesId: "SF",
        setName: "Diamant & Perle : Tempête",
        name: "Diamant & Perle : Tempête - Booster",
      }),
      sources,
    );

    assert.equal(composed.en, "Stormfront - Booster Pack");
  });

  test("distingue Team Rocket de Team Rocket Returns", () => {
    const rocket = composeSealedName(
      product({
        pokecardexSeriesId: "TR",
        setName: "Team Rocket",
        name: "Team Rocket - Booster",
      }),
      sources,
    );
    const returns = composeSealedName(
      product({
        pokecardexSeriesId: "TRR",
        setName: "EX : Team Rocket Returns",
        name: "EX : Team Rocket Returns - Booster",
      }),
      sources,
    );

    assert.equal(rocket.en, "Team Rocket - Booster Pack");
    assert.equal(returns.en, "Team Rocket Returns - Booster Pack");
  });

  test("est idempotent : deux passes donnent le même résultat", () => {
    const raw = product({ name: "Aventures Ensemble - Portfolio A4" });

    assert.deepEqual(
      composeSealedName(raw, sources),
      composeSealedName(raw, sources),
    );
  });
});
