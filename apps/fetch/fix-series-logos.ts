import TCGdex from "@tcgdex/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadToR2, assertR2Config } from "./r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tcgdex = new TCGdex("fr");

const DATA_DIR = path.resolve(__dirname, "../../data");
const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");

assertR2Config();

async function fixSeriesLogos() {
  console.log("Starting series logos fix...");

  if (!fs.existsSync(SERIES_FILE)) {
    console.error("pokemon_series.json not found!");
    return;
  }

  const series = JSON.parse(fs.readFileSync(SERIES_FILE, "utf-8"));
  let updatedCount = 0;

  for (const serie of series) {
    console.log(`Processing series: ${serie.name} (${serie.id})...`);
    try {
      const details = await tcgdex.fetch("series", serie.id);
      if (!details || !details.logo) {
        console.log(`  No logo found in TCGdex for series: ${serie.name}`);
        continue;
      }

      // Reconstruct the proper webp logo URL
      // E.g. https://assets.tcgdex.net/fr/base/base2/logo -> https://assets.tcgdex.net/fr/base/base2/logo.webp
      const urlObj = new URL(details.logo);
      const hasExtension = /\.[a-z0-9]+$/i.test(urlObj.pathname);
      const sourceUrl = hasExtension ? details.logo : `${details.logo}.webp`;
      const key = `series/${serie.id}/logo.webp`;
      
      console.log(`  Uploading ${sourceUrl} to R2...`);
      const logoUrl = await uploadToR2(sourceUrl, key);
      
      if (logoUrl) {
        serie.logo = logoUrl;
        updatedCount++;
        console.log(`  ✅ Logo updated for ${serie.name}: ${logoUrl}`);
      } else {
        console.error(`  ❌ Failed to upload logo for ${serie.name}`);
      }
    } catch (err) {
      console.error(`  Error processing series ${serie.name}:`, err);
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(SERIES_FILE, JSON.stringify(series, null, 4));
    console.log(`\n🎉 Finished! Updated ${updatedCount} series logos in pokemon_series.json.`);
  } else {
    console.log("\nNo logos were updated.");
  }
}

fixSeriesLogos().catch(console.error);
