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
 * Nettoie un nom de fichier pour en faire un nom de produit lisible.
 * "Collection_Illustration_Scalpereur.png" → "Collection Illustration Scalpereur"
 * "Booster2.png" → "Booster 2"
 */
function cleanProductName(filename: string, setName: string): string {
  const withoutExt = filename.replace(/\.\w+$/, "");
  // Séparer les underscores et camelCase
  const cleaned = withoutExt
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Séparer chiffres collés aux lettres : "Booster2" → "Booster 2"
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .trim();

  // Si le nom est trop court/générique, préfixer avec le nom du set
  const generic = ["Booster", "Bundle", "Portfolio", "ETB", "Display"];
  const isGeneric = generic.some(
    (g) => cleaned.toLowerCase().startsWith(g.toLowerCase()),
  );

  if (isGeneric) {
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
          name: cleanProductName(item.imageFilename, item.setName),
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
