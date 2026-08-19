import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  POKECARDEX_SET_IDS,
  SEALED_FREE_NAMES,
  SEALED_TERMS,
} from "./sealed-vocabulary.js";

describe("sealed-vocabulary", () => {
  test("contains valid mappings from pokecardex series to tcgdex sets", () => {
    assert.equal(POKECARDEX_SET_IDS["BS"], "base1");
    assert.equal(POKECARDEX_SET_IDS["TR"], "base5");
    assert.equal(POKECARDEX_SET_IDS["TRR"], "ex7");
    assert.equal(POKECARDEX_SET_IDS["SF"], "dp7");
  });

  test("contains terms with French and English pairs", () => {
    const booster = SEALED_TERMS.find((t) => t.fr === "Booster");
    assert.ok(booster);
    assert.equal(booster.en, "Booster Pack");
    assert.equal(booster.nameFirst, true);

    const etb = SEALED_TERMS.find((t) => t.fr === "Elite Trainer Box");
    assert.ok(etb);
    assert.equal(etb.en, "Elite Trainer Box");
  });

  test("contains free-form product translations", () => {
    assert.equal(SEALED_FREE_NAMES["Duo Deck"], "Duo Deck");
    assert.equal(SEALED_FREE_NAMES["Equipe Bravoure"], "Team Valor");
    assert.equal(SEALED_FREE_NAMES["Niv X"], "LV.X");
  });
});
