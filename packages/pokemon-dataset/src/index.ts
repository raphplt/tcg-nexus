/**
 * Stockage du catalogue Pokémon multilingue.
 *
 * Module volontairement d'un seul tenant : il est chargé par apps/fetch (ESM
 * via tsx), apps/api (CommonJS via ts-node) et Node directement, dont les
 * résolutions de sous-modules TypeScript sont incompatibles entre elles.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import zlib from "zlib";

// === Langues et types ============================================

/**
 * Langues du catalogue. Doit rester aligné avec
 * `apps/api/src/translation/supported-locales.ts` et `apps/web/i18n/config.ts`.
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
 * Carte telle que renvoyée par TCGdex et stockée dans le dataset.
 * On conserve la forme brute du SDK : le mapping vers les entités est la
 * responsabilité du seed, pas du stockage.
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

/** Entrée du manifeste : un fichier du dataset et son empreinte. */
export interface DatasetManifestEntry {
  /** Chemin relatif à `data/`, ex. `fr/cards/base1.ndjson.br`. */
  path: string;
  /** SHA-256 du fichier compressé, en hexadécimal. */
  sha256: string;
  /** Taille du fichier compressé, en octets. */
  bytes: number;
}

export interface DatasetLocaleStats {
  sets: number;
  cards: number;
}

/**
 * Index du dataset publié. Sert au `data:pull` : on ne retélécharge que les
 * fichiers dont l'empreinte diffère de la copie locale.
 */
export interface DatasetManifest {
  /** Version du format de stockage, incrémentée en cas de changement cassant. */
  formatVersion: number;
  generatedAt: string;
  locales: DatasetLocale[];
  stats: Record<string, DatasetLocaleStats>;
  files: DatasetManifestEntry[];
}

export const DATASET_FORMAT_VERSION = 1;

// === Emplacement des fichiers ====================================

/**
 * Racine du dataset. Volontairement indépendante de `__dirname` /
 * `import.meta.url` : ce module est chargé aussi bien en CommonJS (apps/api)
 * qu'en ESM (apps/fetch).
 *
 * Ordre de résolution :
 *   1. `TCG_DATA_DIR` si définie (utile en conteneur, où le dataset est monté) ;
 *   2. le dossier `data/` à la racine du monorepo, repéré via `turbo.json`.
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
    "Racine du monorepo introuvable (turbo.json). Définir TCG_DATA_DIR pour " +
      "pointer explicitement le dossier du dataset.",
  );
}

export function localeDir(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(dataDir, locale);
}

export function cardsDir(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "cards");
}

/** Extension des fichiers de cartes : NDJSON compressé en Brotli. */
export const CARDS_FILE_EXT = ".ndjson.br";

export function setCardsFile(
  locale: DatasetLocale,
  setId: string,
  dataDir = resolveDataDir(),
) {
  // Les ids TCGdex sont alphanumériques (`sv08.5`, `P-A`) ; on refuse tout de
  // même les séparateurs de chemin pour ne jamais écrire hors du dossier.
  if (setId.includes("/") || setId.includes("\\") || setId.includes("..")) {
    throw new Error(`Identifiant de set invalide : ${setId}`);
  }
  return path.join(cardsDir(locale, dataDir), `${setId}${CARDS_FILE_EXT}`);
}

export function setsFile(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "sets.json");
}

export function seriesFile(locale: DatasetLocale, dataDir = resolveDataDir()) {
  return path.join(localeDir(locale, dataDir), "series.json");
}

export function manifestFile(dataDir = resolveDataDir()) {
  return path.join(dataDir, "manifest.json");
}

// === Lecture et écriture =========================================

/**
 * Les cartes sont stockées en NDJSON compressé Brotli, un fichier par set.
 *
 * Un fichier JSON indenté par carte coûtait 80 Mo sur disque pour 20 000
 * fichiers ; le même contenu tient en ~1,4 Mo par langue sous cette forme, et
 * un set entier se lit d'un seul coup (quelques centaines de Ko décompressés).
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

// --- Séries et sets ---------------------------------------------------------

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

// --- Cartes -----------------------------------------------------------------

/** Ids des sets pour lesquels les cartes sont présentes localement. */
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

  // Tri par id pour que deux runs successifs produisent le même fichier
  // — condition nécessaire au diff par empreinte du manifeste.
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
 * Parcourt les cartes d'une langue set par set. Le fichier d'un set est
 * décompressé puis libéré : la mémoire ne dépend pas de la taille du catalogue.
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

// === Manifeste ===================================================

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
 * Construit le manifeste à partir du contenu réel de `data/`.
 * `generatedAt` est passé en paramètre pour que l'appelant maîtrise l'horodatage.
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

    for (const name of ["series.json", "sets.json"]) {
      const file = path.join(dataDir, locale, name);
      if (fs.existsSync(file)) files.push(entryFor(dataDir, file));
    }

    for (const setId of setIds) {
      const file = path.join(dataDir, locale, "cards", `${setId}.ndjson.br`);
      files.push(entryFor(dataDir, file));
      cards += readSetCards(locale, setId, dataDir).length;
    }

    stats[locale] = { sets: readSets(locale, dataDir).length, cards };
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
 * Langues à traiter, lues depuis `LOCALES` (ex. `LOCALES=fr,en`).
 * Toutes les langues supportées par défaut.
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
      `Langue(s) non supportée(s) : ${unknown.join(", ")}. ` +
        `Valeurs possibles : ${DATASET_LOCALES.join(", ")}.`,
    );
  }

  return requested as DatasetLocale[];
}
