/**
 * Converts the legacy `data/<serieId>/<setId>/<cardId>.json` layout
 * (single-locale, ~20,000 files, 80 MB) to the dataset format:
 * `data/<locale>/cards/<setId>.ndjson.br` (~1.4 MB per locale).
 *
 *   npm run data:migrate-layout              # writes data/fr/, keeps the old tree
 *   npm run data:migrate-layout -- --prune   # deletes the old tree
 *
 * Existing data was scraped in French, so it becomes the `fr` locale.
 * Meant to be run once.
 */
import {
  type DatasetCard,
  type DatasetSerie,
  type DatasetSet,
  resolveDataDir,
  setCardsFile,
  writeSeries,
  writeSetCards,
  writeSets,
} from "@repo/pokemon-dataset";
import fs from "fs";
import path from "path";
import { POCKET_SET_IDS } from "./tcgdex-client.js";

const SOURCE_LOCALE = "fr" as const;
const LEGACY_ROOT_FILES = [
  "pokemon_series.json",
  "pokemon_sets.json",
  "sealed_products.json",
];

const dataDir = resolveDataDir();
const prune = process.argv.includes("--prune");

/** Series folders of the legacy layout, at the root of `data/`. */
function legacySerieDirs(): string[] {
  if (!fs.existsSync(dataDir)) return [];
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== SOURCE_LOCALE && name !== "en")
    .map((name) => path.join(dataDir, name));
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function migrate() {
  const serieDirs = legacySerieDirs();
  if (serieDirs.length === 0) {
    console.log("Aucune arborescence à migrer.");
    return;
  }

  const series = readJson<DatasetSerie[]>(
    path.join(dataDir, "pokemon_series.json"),
    [],
  );
  // Pokémon Pocket sets slipped through the old scraper's filter. They belong
  // to a different game and are not carried over.
  const sets = readJson<DatasetSet[]>(
    path.join(dataDir, "pokemon_sets.json"),
    [],
  ).filter((set) => !POCKET_SET_IDS.has(set.id));

  writeSeries(SOURCE_LOCALE, series, dataDir);
  writeSets(SOURCE_LOCALE, sets, dataDir);
  console.log(`${series.length} séries et ${sets.length} sets migrés.`);

  let migratedSets = 0;
  let migratedCards = 0;

  for (const serieDir of serieDirs) {
    for (const entry of fs.readdirSync(serieDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const setId = entry.name;
      if (POCKET_SET_IDS.has(setId)) {
        fs.rmSync(setCardsFile(SOURCE_LOCALE, setId, dataDir), { force: true });
        console.log(`  set Pocket ignoré : ${setId}`);
        continue;
      }

      const setDir = path.join(serieDir, entry.name);
      const cards: DatasetCard[] = [];

      for (const file of fs.readdirSync(setDir)) {
        if (!file.endsWith(".json")) continue;
        try {
          cards.push(
            JSON.parse(
              fs.readFileSync(path.join(setDir, file), "utf-8"),
            ) as DatasetCard,
          );
        } catch (error) {
          console.warn(
            `  Fichier illisible ignoré : ${file} (${String(error)})`,
          );
        }
      }

      if (cards.length === 0) continue;

      writeSetCards(SOURCE_LOCALE, setId, cards, dataDir);
      migratedSets++;
      migratedCards += cards.length;
      process.stdout.write(
        `\r  ${migratedSets} sets, ${migratedCards} cartes migrées`,
      );
    }
  }
  process.stdout.write("\n");

  if (prune) {
    for (const serieDir of serieDirs) {
      fs.rmSync(serieDir, { recursive: true, force: true });
    }
    for (const file of LEGACY_ROOT_FILES) {
      // sealed_products.json is not part of the card catalog: kept as-is.
      if (file === "sealed_products.json") continue;
      fs.rmSync(path.join(dataDir, file), { force: true });
    }
    console.log("Ancienne arborescence supprimée.");
  } else {
    console.log(
      "Ancienne arborescence conservée. Relancer avec --prune pour la supprimer.",
    );
  }
}

migrate();
