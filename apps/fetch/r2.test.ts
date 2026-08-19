import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cardKeyPrefixFromTcgdex } from "./r2.js";

describe("r2 utilities", () => {
  test("cardKeyPrefixFromTcgdex derives valid R2 key from tcgdex url", () => {
    const url = "https://assets.tcgdex.net/fr/swsh/swsh4/185";
    const key = cardKeyPrefixFromTcgdex(url);

    assert.equal(key, "cards/fr/swsh/swsh4/185");
  });

  test("cardKeyPrefixFromTcgdex returns null for non-tcgdex or invalid URLs", () => {
    assert.equal(cardKeyPrefixFromTcgdex("https://images.pokemontcg.io/base1/4"), null);
    assert.equal(cardKeyPrefixFromTcgdex(""), null);
    assert.equal(cardKeyPrefixFromTcgdex("not-a-valid-url"), null);
  });
});
