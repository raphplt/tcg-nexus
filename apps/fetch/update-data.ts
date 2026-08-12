/**
 * Fetches the Pokémon catalog from TCGdex, locale by locale, and writes it to
 * the local dataset (`data/<locale>/`).
 *
 *   npm run update-data                        # locales from LOCALES, else all
 *   npm run update-data -- --locale=en         # one specific locale
 *   npm run update-data -- --refresh           # re-fetches already known sets
 *
 * Each locale keeps its own state: a set already fetched in `fr` is still
 * downloaded in `en`. Sets are persisted as they complete, so an interrupted
 * run resumes where it stopped.
 */
import {
  type DatasetCard,
  type DatasetLocale,
  type DatasetSerie,
  type DatasetSet,
  hasSetCards,
  listSetIds,
  localesFromEnv,
  readSeries,
  readSets,
  resolveDataDir,
  writeSeries,
  writeSetCards,
  writeSets,
} from "@repo/pokemon-dataset";
import { mapWithConcurrency } from "./dataset-remote.js";
import { assertR2Config, migrateCardImageToR2, uploadToR2 } from "./r2.js";
import {
  fetchFrom,
  isPocketSet,
  pocketSerieIds,
  slugify,
} from "./tcgdex-client.js";

/**
 * Card images are re-hosted on R2 (`cards/<locale>/…`). They are
 * locale-dependent: the card text is printed on the artwork itself.
 * Set `MIGRATE_CARD_IMAGES_TO_R2=false` to leave them on the TCGdex CDN.
 */
const MIGRATE_CARD_IMAGES_TO_R2 =
  process.env.MIGRATE_CARD_IMAGES_TO_R2 !== "false";

/** Concurrent card requests. TCGdex tolerates wide bursts poorly. */
const FETCH_CONCURRENCY = Number(process.env.FETCH_CONCURRENCY ?? 5);

const dataDir = resolveDataDir();
const refresh = process.argv.includes("--refresh");

function localesFromArgs(): DatasetLocale[] {
  const flag = process.argv.find((arg) => arg.startsWith("--locale="));
  return localesFromEnv(flag ? flag.slice("--locale=".length) : undefined);
}

/** Merges known and incoming entries, keeping a stable order. */
function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

async function importSeries(locale: DatasetLocale, pocketSeries: Set<string>) {
  const known = new Map(
    readSeries(locale, dataDir).map((serie) => [serie.id, serie]),
  );
  const remote = await fetchFrom<{ id: string; name: string }[]>(
    locale,
    "series",
  );

  if (!remote) throw new Error(`Séries indisponibles en ${locale}.`);

  const fresh: DatasetSerie[] = [];
  for (const serie of remote) {
    if (pocketSeries.has(serie.id) || known.has(serie.id)) continue;

    const details = await fetchFrom<
      DatasetSerie & { logo?: string; sets?: unknown }
    >(locale, "series", serie.id);
    if (!details) continue;

    const { sets: _sets, ...serieData } = details;
    if (details.logo) {
      const logoUrl = await uploadToR2(
        `${details.logo}.webp`,
        `series/${locale}/${serie.id}/logo.webp`,
      );
      if (logoUrl) serieData.logo = logoUrl;
    }

    fresh.push(serieData);
    console.log(`  + série ${serie.name} (${serie.id})`);
  }

  const merged = mergeById([...known.values()], fresh);
  writeSeries(locale, merged, dataDir);
  return merged;
}

/** Fetches a set's cards through a pool of parallel requests. */
async function fetchSetCards(
  locale: DatasetLocale,
  setId: string,
  cardRefs: { id: string }[],
): Promise<DatasetCard[]> {
  let done = 0;

  const cards = await mapWithConcurrency(
    cardRefs,
    FETCH_CONCURRENCY,
    async (cardRef) => {
      let card: DatasetCard | null = null;
      try {
        card = await fetchFrom<DatasetCard>(locale, "cards", cardRef.id);

        if (
          card &&
          MIGRATE_CARD_IMAGES_TO_R2 &&
          typeof card.image === "string"
        ) {
          const migrated = await migrateCardImageToR2(card.image);
          if (migrated?.uploaded) card.image = migrated.newBase;
        }
      } catch (error) {
        // A missing card must not abort the set: log and carry on.
        console.error(`\n  carte ${cardRef.id} (${locale}) : ${String(error)}`);
      }

      done++;
      process.stdout.write(
        `\r  ${setId} [${locale}] ${done}/${cardRefs.length}`,
      );
      return card;
    },
  );
  process.stdout.write("\n");

  return cards.filter((card): card is DatasetCard => card !== null);
}

async function importSets(locale: DatasetLocale, pocketSeries: Set<string>) {
  const knownSets = readSets(locale, dataDir);
  const remote = await fetchFrom<{ id: string; name: string }[]>(
    locale,
    "sets",
  );

  if (!remote) throw new Error(`Sets indisponibles en ${locale}.`);

  const candidates = remote.filter((set) => !isPocketSet(set, pocketSeries));
  // The "already fetched" state is per locale: it is read from the presence
  // of the cards file, not from the sets list alone.
  const pending = refresh
    ? candidates
    : candidates.filter((set) => !hasSetCards(locale, set.id, dataDir));

  console.log(
    `${locale} : ${candidates.length} sets exposés, ${pending.length} à récupérer.`,
  );

  let sets = knownSets;

  for (const setRef of pending) {
    const details = await fetchFrom<
      DatasetSet & { cards?: { id: string }[]; serie?: { id: string } }
    >(locale, "sets", setRef.id);

    if (!details) {
      console.warn(`  set ${setRef.id} indisponible en ${locale} — ignoré.`);
      continue;
    }
    if (isPocketSet(details, pocketSeries)) continue;

    const { cards: cardRefs, serie, ...setMetadata } = details;
    const serieId = typeof serie === "object" ? serie?.id : serie;

    const slug = slugify(String(details.name ?? setRef.id));
    if (typeof details.logo === "string") {
      const logo = await uploadToR2(
        `${details.logo}.webp`,
        `sets/${slug}/logo.webp`,
      );
      if (logo) setMetadata.logo = logo;
    }
    if (typeof details.symbol === "string") {
      const symbol = await uploadToR2(
        `${details.symbol}.png`,
        `sets/${slug}/symbol.png`,
      );
      if (symbol) setMetadata.symbol = symbol;
    }

    if (cardRefs && cardRefs.length > 0) {
      const cards = await fetchSetCards(locale, setRef.id, cardRefs);
      if (cards.length < cardRefs.length) {
        console.warn(
          `  ${setRef.id} : ${cards.length}/${cardRefs.length} cartes récupérées.`,
        );
      }
      writeSetCards(locale, setRef.id, cards, dataDir);
    }

    // The set is only recorded once its cards are written: an interrupted run
    // picks it up again on the next pass.
    sets = mergeById(sets, [{ ...setMetadata, id: setRef.id, serieId }]);
    writeSets(locale, sets, dataDir);
  }

  return sets;
}

async function updateLocale(locale: DatasetLocale) {
  console.log(`\n=== ${locale} ===`);

  const remoteSeries = await fetchFrom<{ id: string; name: string }[]>(
    locale,
    "series",
  );
  const pocketSeries = pocketSerieIds(remoteSeries ?? []);

  const series = await importSeries(locale, pocketSeries);
  const sets = await importSets(locale, pocketSeries);

  const setsWithCards = listSetIds(locale, dataDir).length;
  console.log(
    `${locale} : ${series.length} séries, ${sets.length} sets ` +
      `(${setsWithCards} avec cartes).`,
  );
}

async function main() {
  assertR2Config();
  const locales = localesFromArgs();
  console.log(`Langues : ${locales.join(", ")} — dataset : ${dataDir}`);

  for (const locale of locales) {
    await updateLocale(locale);
  }

  console.log(
    "\nTerminé. `npm run coverage-report` compare les langues, " +
      "`npm run data:push` publie le dataset.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
