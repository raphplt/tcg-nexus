/**
 * Convertit l'ancienne arborescence `data/<serieId>/<setId>/<cardId>.json`
 * (monolingue, ~20 000 fichiers, 80 Mo) vers le format du dataset :
 * `data/<locale>/cards/<setId>.ndjson.br` (~1,4 Mo par langue).
 *
 *   npm run data:migrate-layout              # écrit data/fr/, garde l'ancien
 *   npm run data:migrate-layout -- --prune   # supprime l'ancienne arborescence
 *
 * Les données existantes ayant été scrapées en français, elles deviennent la
 * langue `fr`. À n'exécuter qu'une fois.
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

/** Dossiers de séries de l'ancienne arborescence, à la racine de `data/`. */
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
  // Les sets Pokémon Pocket avaient échappé au filtre de l'ancien scraper.
  // Ils appartiennent à un autre jeu : on ne les reprend pas.
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
      // sealed_products.json n'appartient pas au catalogue de cartes : conservé.
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
