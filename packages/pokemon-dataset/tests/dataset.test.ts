import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import {
  CARDS_FILE_EXT,
  DATASET_FORMAT_VERSION,
  DATASET_LOCALES,
  buildManifest,
  countCards,
  hasSetCards,
  isDatasetLocale,
  iterateSets,
  listSetIds,
  localesFromEnv,
  readManifest,
  readSealedProducts,
  readSeries,
  readSetCards,
  readSets,
  resolveDataDir,
  setCardsFile,
  sha256File,
  writeManifest,
  writeSealedProducts,
  writeSeries,
  writeSetCards,
  writeSets,
  type DatasetCard,
  type DatasetSealedProduct,
} from "../src/index";

let dataDir: string;

before(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-dataset-"));
});

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function card(id: string, extra: Partial<DatasetCard> = {}): DatasetCard {
  return { id, name: `Card ${id}`, ...extra };
}

describe("locales", () => {
  it("recognizes supported locales only", () => {
    for (const locale of DATASET_LOCALES) {
      assert.equal(isDatasetLocale(locale), true);
    }
    assert.equal(isDatasetLocale("de"), false);
    assert.equal(isDatasetLocale(42), false);
    assert.equal(isDatasetLocale(undefined), false);
  });

  it("defaults to every locale when LOCALES is unset", () => {
    assert.deepEqual(localesFromEnv(undefined), [...DATASET_LOCALES]);
    assert.deepEqual(localesFromEnv(""), [...DATASET_LOCALES]);
  });

  it("normalizes case and whitespace in LOCALES", () => {
    assert.deepEqual(localesFromEnv(" FR , en "), ["fr", "en"]);
  });

  it("rejects an unsupported locale rather than silently dropping it", () => {
    assert.throws(() => localesFromEnv("fr,de"), /de/);
  });
});

describe("path resolution", () => {
  it("honours TCG_DATA_DIR over monorepo lookup", () => {
    const previous = process.env.TCG_DATA_DIR;
    process.env.TCG_DATA_DIR = dataDir;
    try {
      assert.equal(resolveDataDir(), path.resolve(dataDir));
    } finally {
      if (previous === undefined) delete process.env.TCG_DATA_DIR;
      else process.env.TCG_DATA_DIR = previous;
    }
  });

  it("builds a card file path under the locale cards folder", () => {
    assert.equal(
      setCardsFile("fr", "base1", dataDir),
      path.join(dataDir, "fr", "cards", `base1${CARDS_FILE_EXT}`),
    );
  });

  // A set id comes from a third-party catalog: it must never escape data/.
  it("rejects set ids that would escape the dataset folder", () => {
    assert.throws(() => setCardsFile("fr", "../evil", dataDir));
    assert.throws(() => setCardsFile("fr", "sub/base1", dataDir));
    assert.throws(() => setCardsFile("fr", "sub\\base1", dataDir));
  });
});

describe("json collections", () => {
  it("returns an empty list when the file does not exist yet", () => {
    assert.deepEqual(readSeries("en", dataDir), []);
    assert.deepEqual(readSets("en", dataDir), []);
    assert.deepEqual(readSealedProducts("en", dataDir), []);
  });

  it("round-trips series, sets and sealed products", () => {
    const product: DatasetSealedProduct = {
      id: "jtg-display",
      pokecardexSeriesId: "JTG",
      setId: "sv09",
      setName: "Journey Together",
      name: "Display Aventures Ensemble",
      productType: "display",
      image: "https://example.test/jtg.png",
      imageFilename: "jtg.png",
    };

    writeSeries("fr", [{ id: "sv", name: "Écarlate et Violet" }], dataDir);
    writeSets("fr", [{ id: "sv09", name: "Aventures Ensemble", serieId: "sv" }], dataDir);
    writeSealedProducts("fr", [product], dataDir);

    assert.deepEqual(readSeries("fr", dataDir), [{ id: "sv", name: "Écarlate et Violet" }]);
    assert.equal(readSets("fr", dataDir)[0]?.serieId, "sv");
    assert.deepEqual(readSealedProducts("fr", dataDir), [product]);
  });

  it("keeps locales isolated from each other", () => {
    writeSets("en", [{ id: "sv09", name: "Journey Together" }], dataDir);
    assert.equal(readSets("fr", dataDir)[0]?.name, "Aventures Ensemble");
    assert.equal(readSets("en", dataDir)[0]?.name, "Journey Together");
  });
});

describe("card storage", () => {
  it("round-trips cards through brotli-compressed ndjson", () => {
    writeSetCards("fr", "base1", [card("base1-2"), card("base1-1")], dataDir);
    const cards = readSetCards("fr", "base1", dataDir);

    assert.equal(cards.length, 2);
    // Cards are sorted on write so the file is stable across runs, which keeps
    // the manifest checksum meaningful.
    assert.deepEqual(
      cards.map((c) => c.id),
      ["base1-1", "base1-2"],
    );
  });

  it("preserves unknown fields coming from the catalog", () => {
    writeSetCards("fr", "base2", [card("base2-1", { hp: "60", types: ["Fire"] })], dataDir);
    const [stored] = readSetCards("fr", "base2", dataDir);

    assert.equal(stored?.hp, "60");
    assert.deepEqual(stored?.types, ["Fire"]);
  });

  it("reports missing card files as empty instead of throwing", () => {
    assert.equal(hasSetCards("fr", "unknown", dataDir), false);
    assert.deepEqual(readSetCards("fr", "unknown", dataDir), []);
  });

  it("lists only card files, sorted", () => {
    fs.writeFileSync(path.join(dataDir, "fr", "cards", "notes.txt"), "ignored");
    assert.deepEqual(listSetIds("fr", dataDir), ["base1", "base2"]);
  });

  it("returns no set id when the locale has no cards folder", () => {
    assert.deepEqual(listSetIds("en", dataDir), []);
  });

  it("iterates and counts cards across every set of a locale", () => {
    const seen = [...iterateSets("fr", dataDir)];

    assert.deepEqual(
      seen.map((entry) => entry.setId),
      ["base1", "base2"],
    );
    assert.equal(countCards("fr", dataDir), 3);
    assert.equal(countCards("en", dataDir), 0);
  });
});

describe("manifest", () => {
  it("returns null when no manifest has been published", () => {
    assert.equal(readManifest(dataDir), null);
  });

  it("describes every dataset file with its checksum and size", () => {
    const manifest = buildManifest(["fr"], "2026-08-20T00:00:00.000Z", dataDir);

    assert.equal(manifest.formatVersion, DATASET_FORMAT_VERSION);
    assert.deepEqual(manifest.locales, ["fr"]);
    assert.deepEqual(manifest.stats.fr, { sets: 1, cards: 3, sealedProducts: 1 });

    const paths = manifest.files.map((entry) => entry.path);
    assert.deepEqual(paths, [...paths].sort());
    assert.ok(paths.includes("fr/cards/base1.ndjson.br"));
    assert.ok(paths.includes("fr/sealed-products.json"));

    const entry = manifest.files.find((f) => f.path === "fr/cards/base1.ndjson.br");
    const file = setCardsFile("fr", "base1", dataDir);
    assert.equal(entry?.sha256, sha256File(file));
    assert.equal(entry?.bytes, fs.statSync(file).size);
  });

  it("changes the checksum when the underlying cards change", () => {
    const before = buildManifest(["fr"], "2026-08-20T00:00:00.000Z", dataDir);
    writeSetCards("fr", "base1", [card("base1-1"), card("base1-3")], dataDir);
    const after = buildManifest(["fr"], "2026-08-20T00:00:00.000Z", dataDir);

    const pick = (m: typeof before) =>
      m.files.find((f) => f.path === "fr/cards/base1.ndjson.br")?.sha256;
    assert.notEqual(pick(before), pick(after));
  });

  it("round-trips through write and read", () => {
    const manifest = buildManifest(["fr", "en"], "2026-08-20T00:00:00.000Z", dataDir);
    writeManifest(manifest, dataDir);

    assert.deepEqual(readManifest(dataDir), manifest);
  });
});
