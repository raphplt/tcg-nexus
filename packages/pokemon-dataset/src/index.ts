/**
 * Multilingual Pokémon catalog storage.
 *
 * Deliberately kept as a single module: it is loaded by apps/fetch (ESM via
 * tsx), apps/api (CommonJS via ts-node) and Node itself, whose TypeScript
 * submodule resolutions are mutually incompatible.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";

/**
 * Catalog locales. Must stay aligned with
 * `apps/api/src/translation/supported-locales.ts` and `apps/web/i18n/config.ts`.
 */
export const DATASET_LOCALES = ["fr", "en"] as const;

export type DatasetLocale = (typeof DATASET_LOCALES)[number];

export const DATASET_FALLBACK_LOCALE: DatasetLocale = "en";

export function isDatasetLocale(value: unknown): value is DatasetLocale {
  return (
    typeof value === "string" &&
    (DATASET_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * A card as returned by TCGdex and stored in the dataset.
 * The raw SDK shape is preserved: mapping to entities is the seed's
 * responsibility, not the storage layer's.
 */
export interface DatasetCard {
  id: string;
  localId?: string;
  name?: string;
  image?: string;
  category?: string;
  illustrator?: string;
  rarity?: string;
  set?: { id: string; name?: string };
  [key: string]: unknown;
}

export interface DatasetSet {
  id: string;
  name?: string;
  serieId?: string;
  [key: string]: unknown;
}

export interface DatasetSerie {
  id: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * A sealed product — booster, Elite Trainer Box, portfolio — in one locale.
 *
 * `name` and `setName` are localized; every other field is language-neutral
 * and repeated identically across locales, as for sets. A product missing from
 * a locale's file simply has no name in that language, and the API falls back.
 */
export interface DatasetSealedProduct {
  id: string;
  /** Pokécardex series code the product was scraped from, e.g. "JTG". */
  pokecardexSeriesId: string;
  /** TCGdex set identifier, null for products belonging to no set. */
  setId: string | null;
  setName: string | null;
  name: string;
  productType: string;
  image: string;
  imageFilename: string;
}

/** Manifest entry: one dataset file and its checksum. */
export interface DatasetManifestEntry {
  /** Path relative to `data/`, e.g. `fr/cards/base1.ndjson.br`. */
  path: string;
  /** SHA-256 of the compressed file, hexadecimal. */
  sha256: string;
  /** Size of the compressed file, in bytes. */
  bytes: number;
}

export interface DatasetLocaleStats {
  sets: number;
  cards: number;
  sealedProducts: number;
}

/**
 * Index of the published dataset. Drives `data:pull`: only files whose
 * checksum differs from the local copy are downloaded again.
 */
export interface DatasetManifest {
  /** Storage format version, bumped on any breaking change. */
  formatVersion: number;
  generatedAt: string;
  locales: DatasetLocale[];
  stats: Record<string, DatasetLocaleStats>;
  files: DatasetManifestEntry[];
}

export const DATASET_FORMAT_VERSION = 1;

/**
 * Dataset root. Deliberately independent from `__dirname` /
 * `import.meta.url`: this module is loaded both as CommonJS (apps/api) and as
 * ESM (apps/fetch).
 *
 * Resolution order:
 *   1. `TCG_DATA_DIR` when set (useful in containers, where it is mounted);
 *   2. the `data/` folder at the monorepo root, located through `turbo.json`.
 */
export function resolveDataDir(): string {
  const fromEnv = process.env.TCG_DATA_DIR;
  if (fromEnv) return path.resolve(fromEnv);

  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, "turbo.json"))) {
      return path.join(dir, "data");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    "Monorepo root not found (turbo.json). Set TCG_DATA_DIR to point at the " +
      "dataset folder explicitly.",
  );
}

export function localeDir(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(dataDir, locale);
}

export function cardsDir(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "cards");
}

/** Card file extension: Brotli-compressed NDJSON. */
export const CARDS_FILE_EXT = ".ndjson.br";

export function setCardsFile(
  locale: DatasetLocale,
  setId: string,
  dataDir = resolveDataDir(),
) {
  if (setId.includes("/") || setId.includes("\\") || setId.includes("..")) {
    throw new Error(`Invalid set identifier: ${setId}`);
  }
  return path.join(cardsDir(locale, dataDir), `${setId}${CARDS_FILE_EXT}`);
}

export function setsFile(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "sets.json");
}

export function seriesFile(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "series.json");
}

export function sealedProductsFile(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
) {
  return path.join(localeDir(locale, dataDir), "sealed-products.json");
}

export function manifestFile(dataDir = resolveDataDir()) {
  return path.join(dataDir, "manifest.json");
}

/**
 * Cards are stored as Brotli-compressed NDJSON, one file per set.
 *
 * One indented JSON file per card cost 80 MB on disk across 20,000 files; the
 * same content fits in ~1.4 MB per locale in this form, and a whole set is
 * read in one go (a few hundred KB once decompressed).
 */
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_QUALITY]: 9,
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
  },
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonFile<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function writeJsonFile(file: string, value: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readSeries(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): DatasetSerie[] {
  return readJsonFile<DatasetSerie[]>(seriesFile(locale, dataDir), []);
}

export function writeSeries(
  locale: DatasetLocale,
  series: DatasetSerie[],
  dataDir = resolveDataDir(),
) {
  writeJsonFile(seriesFile(locale, dataDir), series);
}

export function readSets(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): DatasetSet[] {
  return readJsonFile<DatasetSet[]>(setsFile(locale, dataDir), []);
}

export function writeSets(
  locale: DatasetLocale,
  sets: DatasetSet[],
  dataDir = resolveDataDir(),
) {
  writeJsonFile(setsFile(locale, dataDir), sets);
}

export function readSealedProducts(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): DatasetSealedProduct[] {
  return readJsonFile<DatasetSealedProduct[]>(
    sealedProductsFile(locale, dataDir),
    [],
  );
}

export function writeSealedProducts(
  locale: DatasetLocale,
  products: DatasetSealedProduct[],
  dataDir = resolveDataDir(),
) {
  writeJsonFile(sealedProductsFile(locale, dataDir), products);
}

/** Ids of the sets whose cards are present locally. */
export function listSetIds(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): string[] {
  const dir = cardsDir(locale, dataDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(CARDS_FILE_EXT))
    .map((file) => file.slice(0, -CARDS_FILE_EXT.length))
    .sort();
}

export function hasSetCards(
  locale: DatasetLocale,
  setId: string,
  dataDir = resolveDataDir(),
): boolean {
  return fs.existsSync(setCardsFile(locale, setId, dataDir));
}

export function readSetCards(
  locale: DatasetLocale,
  setId: string,
  dataDir = resolveDataDir(),
): DatasetCard[] {
  const file = setCardsFile(locale, setId, dataDir);
  if (!fs.existsSync(file)) return [];

  const ndjson = zlib.brotliDecompressSync(fs.readFileSync(file)).toString();
  return ndjson
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as DatasetCard);
}

export function writeSetCards(
  locale: DatasetLocale,
  setId: string,
  cards: DatasetCard[],
  dataDir = resolveDataDir(),
) {
  const file = setCardsFile(locale, setId, dataDir);
  ensureDir(path.dirname(file));

  const ndjson = [...cards]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((card) => JSON.stringify(card))
    .join("\n");

  fs.writeFileSync(
    file,
    zlib.brotliCompressSync(Buffer.from(ndjson), BROTLI_OPTIONS),
  );
}

/**
 * Iterates over a locale's cards, set by set. Each set file is decompressed
 * then released: memory use does not depend on catalog size.
 */
export function* iterateSets(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): Generator<{ setId: string; cards: DatasetCard[] }> {
  for (const setId of listSetIds(locale, dataDir)) {
    yield { setId, cards: readSetCards(locale, setId, dataDir) };
  }
}

export function countCards(
  locale: DatasetLocale,
  dataDir = resolveDataDir(),
): number {
  let total = 0;
  for (const { cards } of iterateSets(locale, dataDir)) {
    total += cards.length;
  }
  return total;
}

export function sha256File(file: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function entryFor(dataDir: string, absolutePath: string): DatasetManifestEntry {
  return {
    path: path.relative(dataDir, absolutePath).split(path.sep).join("/"),
    sha256: sha256File(absolutePath),
    bytes: fs.statSync(absolutePath).size,
  };
}

/**
 * Builds the manifest from the actual contents of `data/`.
 * `generatedAt` is a parameter so the caller controls the timestamp.
 */
export function buildManifest(
  locales: DatasetLocale[],
  generatedAt: string,
  dataDir = resolveDataDir(),
): DatasetManifest {
  const files: DatasetManifestEntry[] = [];
  const stats: Record<string, DatasetLocaleStats> = {};

  for (const locale of locales) {
    const setIds = listSetIds(locale, dataDir);
    let cards = 0;

    for (const name of ["series.json", "sets.json", "sealed-products.json"]) {
      const file = path.join(dataDir, locale, name);
      if (fs.existsSync(file)) files.push(entryFor(dataDir, file));
    }

    for (const setId of setIds) {
      const file = path.join(dataDir, locale, "cards", `${setId}.ndjson.br`);
      files.push(entryFor(dataDir, file));
      cards += readSetCards(locale, setId, dataDir).length;
    }

    stats[locale] = {
      sets: readSets(locale, dataDir).length,
      cards,
      sealedProducts: readSealedProducts(locale, dataDir).length,
    };
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    formatVersion: DATASET_FORMAT_VERSION,
    generatedAt,
    locales,
    stats,
    files,
  };
}

export function readManifest(
  dataDir = resolveDataDir(),
): DatasetManifest | null {
  const file = manifestFile(dataDir);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as DatasetManifest;
}

export function writeManifest(
  manifest: DatasetManifest,
  dataDir = resolveDataDir(),
) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    manifestFile(dataDir),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/**
 * Locales to process, read from `LOCALES` (e.g. `LOCALES=fr,en`).
 * Defaults to every supported locale.
 */
export function localesFromEnv(value = process.env.LOCALES): DatasetLocale[] {
  if (!value) return [...DATASET_LOCALES];

  const requested = value
    .split(",")
    .map((locale) => locale.trim().toLowerCase())
    .filter(Boolean);

  const unknown = requested.filter(
    (locale) => !(DATASET_LOCALES as readonly string[]).includes(locale),
  );
  if (unknown.length > 0) {
    throw new Error(
      `Unsupported locale(s): ${unknown.join(", ")}. ` +
        `Allowed values: ${DATASET_LOCALES.join(", ")}.`,
    );
  }

  return requested as DatasetLocale[];
}
