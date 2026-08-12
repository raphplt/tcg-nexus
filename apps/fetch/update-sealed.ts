/**
 * Updates the Pokémon sealed-product list through Puppeteer and writes one
 * `data/<locale>/sealed-products.json` per catalog language for the API seed.
 * Images retain their absolute Pokécardex URLs.
 *
 * Pokécardex is French-only: English names are composed rather than scraped
 * (see `sealed-names.ts`). Pass `--from-legacy` to rebuild both locales from
 * the previously scraped `data/sealed_products.json` without hitting the site.
 */
import {
  type DatasetSealedProduct,
  writeSealedProducts,
} from "@repo/pokemon-dataset";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PokecardexService } from "./pokecardex.service.js";
import {
  composeSealedName,
  loadSealedNameSources,
  type RawSealedProduct,
  resolveSealedSetId,
} from "./sealed-names.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
const LEGACY_FILE = path.join(DATA_DIR, "sealed_products.json");

type SealedProductRecord = RawSealedProduct;

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Exact mapping from a normalized filename to a display name. The set name is added afterward.
 *
 * NOTE: the French labels produced here must exist in `SEALED_TERMS`
 * (`sealed-vocabulary.ts`), otherwise the product gets no English name.
 */
const TERM_MAP: Record<string, string> = {
  booster: "Booster",
  bundle: "Coffret Dresseur",
  echantillon: "Échantillon",
  echantilon: "Échantillon",
  duopack: "Duo Pack",
  tripack: "Tripack",
  pack: "Pack",
  packap: "Pack Avant-Première",
  display: "Display",
  minitin: "Mini Tin",
  minitins: "Mini Tins",
  minifolio: "Mini Portfolio",
  tin: "Tin",
  ting: "Tin",
  etb: "Elite Trainer Box",
  etbpokemon_center: "Elite Trainer Box Pokémon Center",
  portfolio: "Portfolio",
  portfoliojp: "Portfolio Japonais",
  miniportfolio: "Mini Portfolio",
  a4: "Portfolio A4",
  a5: "Portfolio A5",
  a4eta5: "Portfolio A4 & A5",
  a4eta: "Portfolio A4 & A5",
  classeur: "Classeur",
  valisette: "Valisette",
  pochette: "Pochette",
  poster: "Poster",
  album: "Album",
  albumjp: "Album Japonais",
  calendrier: "Calendrier",
  deckbox: "Deck Box",
  banniere: "Bannière",
  coffret_premium: "Coffret Premium",
  coffret_folio: "Coffret Portfolio",
  coffret_poster: "Coffret Poster",
  coffret_pikachu: "Coffret Pikachu",
  coffret_alakazam: "Coffret Alakazam",
  coffret_electhor: "Coffret Électhor",
  premiumcollection: "Collection Premium",
  collection_premium: "Collection Premium",
  boitesurprise: "Boîte Surprise",
  contenu: "Contenu du Coffret",
  upc: "Ultra Premium Collection",
  pps: "Pack Premium Spécial",
  "1setenglish": "Set Anglais",
  happy_meal: "McDonald's Happy Meal",
  sw: "Starter Set",
  dp: "Starter Set",
  mt: "Starter Set",
};

/**
 * Names starting with one of these terms receive the set-name prefix.
 */
const ALWAYS_PREFIX = [
  "booster",
  "coffret",
  "portfolio",
  "elite trainer",
  "display",
  "mini tin",
  "mini portfolio",
  "tripack",
  "duo pack",
  "pack",
  "starter",
  "deck box",
  "tin ",
  "valisette",
  "classeur",
  "pochette",
  "poster",
  "album",
  "échantillon",
  "boîte",
  "bundle",
];

/**
 * Nettoie un nom de fichier en nom de produit lisible.
 */
function cleanProductName(
  filename: string,
  setName: string,
  productType: string,
): string {
  let base = filename.replace(/\.\w+$/, "");

  base = base.replace(/^\d+px-/, "");
  base = base.replace(/^[A-Z]{2,4}\d*_3D_/, "");
  base = base.replace(/^PO[A-Z]{2,4}\d+_[A-Z]+\d*_/, "");
  base = base.replace(/^POLL\d+_[A-Z]+_/, "");
  base = base.replace(/[_-](FR|EN|JP|medium)$/i, "");
  base = base.replace(/_/g, " ").trim();

  const keyFull = base.toLowerCase().replace(/\s+/g, "");
  const keyNoTrailingNum = keyFull.replace(/\d+$/, "");
  const mapped =
    TERM_MAP[keyFull] ||
    TERM_MAP[keyNoTrailingNum] ||
    TERM_MAP[base.toLowerCase()];

  if (mapped) {
    const exactMatch = !!TERM_MAP[keyFull];
    const numMatch = !exactMatch ? base.match(/(\d+)$/) : null;
    const suffix = numMatch ? ` ${numMatch[1]}` : "";
    return `${setName} - ${mapped}${suffix}`;
  }

  let cleaned = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(/\s*Recto$/i, "");

  if (/^\d+$/.test(cleaned) || cleaned.length <= 3) {
    const typeLabel =
      {
        booster: "Booster",
        etb: "Elite Trainer Box",
        box: "Coffret",
        tin: "Tin",
        deck: "Deck",
        portfolio: "Portfolio",
        display: "Display",
        tripack: "Tripack",
        collection_box: "Coffret Collection",
        other: "Produit",
      }[productType] || "Produit";
    const suffix = /^\d+$/.test(cleaned) ? ` ${cleaned}` : "";
    return `${setName} - ${typeLabel}${suffix}`;
  }

  const cleanedLower = cleaned.toLowerCase();
  const needsPrefix =
    ALWAYS_PREFIX.some((g) => cleanedLower.startsWith(g)) ||
    cleaned.length <= 6;

  if (needsPrefix) {
    return `${setName} - ${cleaned}`;
  }

  return cleaned;
}

function buildId(seriesId: string, filename: string): string {
  const ext = filename.includes(".")
    ? filename.substring(0, filename.lastIndexOf("."))
    : filename;
  return `${seriesId.toLowerCase()}-${slugify(ext)}`;
}

/**
 * Writes one dataset file per locale and reports the English coverage.
 *
 * A product whose English name cannot be composed is left out of the English
 * file: the API then serves the French name rather than an approximation.
 */
function writeLocalizedDatasets(records: SealedProductRecord[]) {
  const sources = loadSealedNameSources();

  const french: DatasetSealedProduct[] = [];
  const english: DatasetSealedProduct[] = [];
  const skipped = { set: 0, label: 0 };
  const samples: string[] = [];

  for (const record of records) {
    const setId = resolveSealedSetId(record);
    const composed = composeSealedName(record, sources);
    const shared = {
      id: record.id,
      pokecardexSeriesId: record.pokecardexSeriesId,
      setId,
      productType: record.productType,
      image: record.image,
      imageFilename: record.imageFilename,
    };

    french.push({
      ...shared,
      setName: record.setName ?? null,
      name: composed.fr,
    });

    if (composed.en) {
      english.push({
        ...shared,
        setName: setId ? (sources.setNames.get(setId)?.en ?? null) : null,
        name: composed.en,
      });
    } else if (composed.skipped) {
      skipped[composed.skipped]++;
      if (samples.length < 15) samples.push(composed.fr);
    }
  }

  writeSealedProducts("fr", french);
  writeSealedProducts("en", english);

  const coverage = ((english.length / french.length) * 100).toFixed(1);
  console.log(`\nfr: ${french.length} products`);
  console.log(`en: ${english.length} products (${coverage}% coverage)`);
  console.log(
    `Not composed — unknown set: ${skipped.set}, ` +
      `untranslatable label: ${skipped.label}`,
  );
  if (samples.length) {
    console.log(`Sample of untranslated names:\n  ${samples.join("\n  ")}`);
  }
}

async function main() {
  console.log("=== Pokecardex sealed products updater ===");
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (process.argv.includes("--from-legacy")) {
    if (!fs.existsSync(LEGACY_FILE)) {
      throw new Error(`${LEGACY_FILE} not found — run without --from-legacy.`);
    }
    console.log(`Rebuilding locales from ${LEGACY_FILE} (no scraping).`);
    const records = JSON.parse(
      fs.readFileSync(LEGACY_FILE, "utf-8"),
    ) as SealedProductRecord[];
    writeLocalizedDatasets(records);
    return;
  }

  const service = new PokecardexService();
  await service.init();

  console.log("Fetching pokecardex series list...");
  const series = await service.fetchSeriesList();
  console.log(`Found ${series.length} series.`);

  const records: SealedProductRecord[] = [];
  const seenIds = new Set<string>();
  let processed = 0;

  for (const serie of series) {
    processed++;
    process.stdout.write(
      `[${processed}/${series.length}] ${serie.id} (${serie.name})... `,
    );

    try {
      const items = await service.scrapeSeriesItems(serie.id);
      let added = 0;

      for (const item of items) {
        if (!item.imageFilename) continue;

        const id = buildId(item.seriesId, item.imageFilename);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        records.push({
          id,
          pokecardexSeriesId: item.seriesId,
          setName: item.setName,
          name: cleanProductName(
            item.imageFilename,
            item.setName,
            item.productType,
          ),
          productType: item.productType,
          image: item.imageUrl,
          imageFilename: item.imageFilename,
        });
        added++;
      }

      console.log(`${added} items`);
    } catch (error: any) {
      console.log(`FAILED (${error.message})`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  await service.close();

  // Kept as the scraper's raw output: it is the only French source, and
  // `--from-legacy` rebuilds the locale files from it without scraping again.
  fs.writeFileSync(LEGACY_FILE, JSON.stringify(records, null, 2));
  console.log(`\nWrote ${records.length} scraped records to ${LEGACY_FILE}`);

  writeLocalizedDatasets(records);
}

main().catch(async (err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
