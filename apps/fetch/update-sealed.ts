/**
 * Met à jour la liste des produits scellés Pokémon via Puppeteer (pokecardex.com).
 *
 * Sortie : `data/sealed_products.json` — consommé par le seed côté API.
 *
 * Les images sont référencées directement depuis pokecardex.com
 * (URL absolue stockée dans le champ `image`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PokecardexService } from "./pokecardex.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_FILE = path.join(DATA_DIR, "sealed_products.json");

interface SealedProductRecord {
  id: string;
  pokecardexSeriesId: string;
  setName: string;
  name: string;
  productType: string;
  /** URL absolue de l'image (pokecardex CDN) */
  image: string;
  imageFilename: string;
}

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
 * Mapping exact (clé = filename sans extension ni chiffres finaux, en lowercase)
 * → nom lisible. Toujours préfixé par le set ensuite.
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
 * Si le nom nettoyé commence par l'un de ces termes, on préfixe par le set.
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

  // Retirer préfixes parasites
  base = base.replace(/^\d+px-/, ""); // "315px-BW1_Booster..."
  base = base.replace(/^[A-Z]{2,4}\d*_3D_/, ""); // "BW8_3D_Booster..."
  base = base.replace(/^PO[A-Z]{2,4}\d+_[A-Z]+\d*_/, ""); // "POBW1001_BOX3D_1_"
  base = base.replace(/^POLL\d+_[A-Z]+_/, ""); // "POLL01_BOX3D_1_"
  base = base.replace(/[_-](FR|EN|JP|medium)$/i, ""); // suffixes langue
  base = base.replace(/_/g, " ").trim();

  // Lookup dans le mapping exact — essayer d'abord le nom complet, puis sans chiffres finaux
  const keyFull = base.toLowerCase().replace(/\s+/g, "");
  const keyNoTrailingNum = keyFull.replace(/\d+$/, "");
  const mapped =
    TERM_MAP[keyFull] ||
    TERM_MAP[keyNoTrailingNum] ||
    TERM_MAP[base.toLowerCase()];

  if (mapped) {
    // Si la clé avec chiffres a matché directement, pas de suffixe
    // Si c'est la clé sans chiffres qui a matché, ajouter le numéro
    const exactMatch = !!TERM_MAP[keyFull];
    const numMatch = !exactMatch ? base.match(/(\d+)$/) : null;
    const suffix = numMatch ? ` ${numMatch[1]}` : "";
    return `${setName} - ${mapped}${suffix}`;
  }

  // Nettoyage standard
  let cleaned = base
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(/\s*Recto$/i, "");

  // Si purement numérique ou très court → nom générique basé sur le type
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

  // Si le nom commence par un terme générique → préfixer
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

async function main() {
  console.log("=== Pokecardex sealed products updater ===");
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

    // Soyons polis avec pokecardex
    await new Promise((r) => setTimeout(r, 500));
  }

  await service.close();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2));
  console.log(
    `\nWrote ${records.length} sealed product records to ${OUTPUT_FILE}`,
  );
}

main().catch(async (err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
