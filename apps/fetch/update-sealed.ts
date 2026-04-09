/**
 * Met à jour la liste des produits scellés Pokémon en scrapant pokecardex.com.
 *
 * Sortie : `apps/data/sealed_products.json` — consommé par le seed côté API.
 *
 * Les images sont supposées déjà présentes dans le bucket R2 sous la clé
 * `pokecardex/{seriesId}/{filename}`. Ce script ne fait pas de re-upload.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PokecardexItem, PokecardexService } from "./pokecardex.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
const OUTPUT_FILE = path.join(DATA_DIR, "sealed_products.json");

interface SealedProductRecord {
  /** Identifiant stable : "{seriesId}-{slug(imageFilenameWithoutExt)}" */
  id: string;
  pokecardexSeriesId: string;
  /** Nom de la série tel qu'affiché sur pokecardex (FR) */
  setName: string;
  /** Nom du produit (depuis l'attribut alt de l'image) */
  name: string;
  productType: string;
  /** Chemin relatif dans R2, ex : "pokecardex/AQ/Booster_Aquapolis_Arcanin.png" */
  image: string;
  /** Nom de fichier brut */
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

function buildId(item: PokecardexItem): string {
  const ext = item.imageFilename.includes(".")
    ? item.imageFilename.substring(0, item.imageFilename.lastIndexOf("."))
    : item.imageFilename;
  return `${item.seriesId.toLowerCase()}-${slugify(ext)}`;
}

async function main() {
  console.log("=== Pokecardex sealed products updater ===");
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const service = new PokecardexService();

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

        const id = buildId(item);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        records.push({
          id,
          pokecardexSeriesId: item.seriesId,
          setName: item.setName,
          name: item.name,
          productType: item.productType,
          image: `pokecardex/${item.seriesId}/${item.imageFilename}`,
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

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(records, null, 2));
  console.log(
    `\nWrote ${records.length} sealed product records to ${OUTPUT_FILE}`,
  );
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
