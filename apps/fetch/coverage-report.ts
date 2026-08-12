/**
 * Compares catalog coverage across locales, without writing anything.
 *
 *   npm run coverage-report              # local dataset
 *   npm run coverage-report -- --remote  # compares against the TCGdex catalog
 *
 * This is the metric that decides whether a locale can be enabled: a locale
 * missing a third of the sets should not be offered to users.
 */
import {
  type DatasetLocale,
  listSetIds,
  localesFromEnv,
  readSetCards,
  readSets,
  resolveDataDir,
} from "@repo/pokemon-dataset";
import { isPocketSet, pocketSerieIds, tcgdexFor } from "./tcgdex-client.js";

const dataDir = resolveDataDir();
const remote = process.argv.includes("--remote");
const locales = localesFromEnv();

interface LocaleCoverage {
  locale: DatasetLocale;
  sets: number;
  setsWithCards: number;
  cards: number;
  remoteSets: number | null;
}

async function remoteSetCount(locale: DatasetLocale): Promise<number | null> {
  const tcgdex = tcgdexFor(locale);
  const series = (await tcgdex.fetch("series")) as
    | { id: string; name: string }[]
    | null;
  const sets = (await tcgdex.fetch("sets")) as
    | { id: string; name: string }[]
    | null;
  if (!sets) return null;

  const pocket = pocketSerieIds(series ?? []);
  return sets.filter((set) => !isPocketSet(set, pocket)).length;
}

function localCoverage(locale: DatasetLocale) {
  const setIds = listSetIds(locale, dataDir);
  let cards = 0;
  for (const setId of setIds) {
    cards += readSetCards(locale, setId, dataDir).length;
  }
  return {
    sets: readSets(locale, dataDir).length,
    setsWithCards: setIds.length,
    cards,
  };
}

/** Sets present in one locale and missing from another. */
function reportGaps(coverages: LocaleCoverage[]) {
  if (coverages.length < 2) return;

  const idsByLocale = new Map(
    coverages.map(({ locale }) => [
      locale,
      new Set(listSetIds(locale, dataDir)),
    ]),
  );

  for (const { locale } of coverages) {
    const mine = idsByLocale.get(locale) as Set<string>;
    for (const { locale: other } of coverages) {
      if (other === locale) continue;
      const theirs = idsByLocale.get(other) as Set<string>;
      const missing = [...theirs].filter((setId) => !mine.has(setId));
      if (missing.length === 0) continue;

      console.log(
        `\n${missing.length} set(s) présent(s) en ${other} et absent(s) en ${locale} :`,
      );
      console.log(
        `  ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "…" : ""}`,
      );
    }
  }
}

async function main() {
  const coverages: LocaleCoverage[] = [];

  for (const locale of locales) {
    const local = localCoverage(locale);
    coverages.push({
      locale,
      ...local,
      remoteSets: remote ? await remoteSetCount(locale) : null,
    });
  }

  console.log("Langue | sets | sets avec cartes | cartes | sets TCGdex");
  for (const coverage of coverages) {
    console.log(
      `${coverage.locale.padEnd(6)} | ${String(coverage.sets).padStart(4)} | ` +
        `${String(coverage.setsWithCards).padStart(16)} | ` +
        `${String(coverage.cards).padStart(6)} | ` +
        `${coverage.remoteSets === null ? "—" : coverage.remoteSets}`,
    );
  }

  reportGaps(coverages);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
