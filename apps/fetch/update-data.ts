import TCGdex from "@tcgdex/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tcgdex = new TCGdex("fr");

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const DATA_DIR = path.resolve(__dirname, "../../data");
const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");
const SETS_FILE = path.join(DATA_DIR, "pokemon_sets.json");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME ||
  !R2_PUBLIC_URL
) {
  console.error("Missing R2 credentials in .env file");
  process.exit(1);
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(url: string, key: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get("content-type") || "image/png",
      }),
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error(`Failed to upload ${url} to R2:`, error);
    return null;
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function updateData() {
  console.log("Starting data update...");

  // Ensure data directory exists
  console.log(`Using Data Directory: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Load local data (create empty files if not exist)
  console.log("Loading local data...");
  if (!fs.existsSync(SERIES_FILE)) fs.writeFileSync(SERIES_FILE, "[]");
  if (!fs.existsSync(SETS_FILE)) fs.writeFileSync(SETS_FILE, "[]");

  const localSeries = JSON.parse(fs.readFileSync(SERIES_FILE, "utf-8"));
  const localSets = JSON.parse(fs.readFileSync(SETS_FILE, "utf-8"));
  const localSeriesIds = new Set(localSeries.map((s: any) => s.id));
  const localSetsIds = new Set(localSets.map((s: any) => s.id));

  // 2. Fetch remote lists
  console.log("Fetching remote lists...");
  const remoteSeries = await tcgdex.fetch("series");
  const remoteSets = await tcgdex.fetch("sets");

  if (!remoteSeries || !remoteSets) {
    console.error("Failed to fetch remote data.");
    return;
  }

  // 3. Identify new items
  const pocketSeriesIds = new Set(
    remoteSeries
      .filter((s: any) => s.name.toLowerCase().includes("pocket"))
      .map((s: any) => s.id),
  );

  const newSeries = remoteSeries.filter(
    (s: any) => !localSeriesIds.has(s.id) && !pocketSeriesIds.has(s.id),
  );

  const newSets = remoteSets.filter((s: any) => {
    const isNew = !localSetsIds.has(s.id);
    const isPocketName = s.name.toLowerCase().includes("pocket");

    // Check if set belongs to a Pocket series
    const serieId = s.serie?.id || s.serie;
    const isPocketSerie = pocketSeriesIds.has(serieId);

    // Also filter by specific Pocket set IDs
    const knownPocketSetIds = ["A1", "A1a", "A2", "A2a", "A2b", "P-A"];
    const isKnownPocketId = knownPocketSetIds.includes(s.id);

    return isNew && !isPocketName && !isPocketSerie && !isKnownPocketId;
  });

  console.log(
    `Found ${newSeries.length} new series and ${newSets.length} new sets.`,
  );

  if (newSeries.length === 0 && newSets.length === 0) {
    console.log("No new data to update.");
    return;
  }

  // 4. Fetch details for new series
    console.log("Fetching details for new series...");
    for (const serie of newSeries) {
      const details = await tcgdex.fetch("series", serie.id);
      if (details) {
        // Strip 'sets' to avoid bloating the file
        const { sets, ...seriesData } = details;
        localSeries.push(seriesData);
        console.log(`Added series: ${serie.name}`);
      }
    }
    fs.writeFileSync(SERIES_FILE, JSON.stringify(localSeries, null, 4));
    console.log("Updated pokemon_series.json");
  }

  // 5. Fetch details for new sets and their cards
    console.log("Fetching details for new sets...");

    for (const set of newSets) {
      console.log(`Processing set: ${set.name} (${set.id})...`);
      const setDetails = await tcgdex.fetch("sets", set.id);

      if (!setDetails) continue;

      // Prepare set metadata
      const { cards, serie, ...setMetadata } = setDetails;
      const serieId = serie.id || serie; // Handle if it's an object or ID

      // Upload Set Images to R2
      const slug = slugify(set.name);
      if (setDetails.logo) {
        const logoKey = `sets/${slug}/logo.webp`;
        const logoUrl = await uploadToR2(setDetails.logo + ".webp", logoKey);
        if (logoUrl) setMetadata.logo = logoUrl;
      }
      if (setDetails.symbol) {
        const symbolKey = `sets/${slug}/symbol.png`;
        const symbolUrl = await uploadToR2(
          setDetails.symbol + ".png",
          symbolKey,
        );
        if (symbolUrl) setMetadata.symbol = symbolUrl;
      }

      const setToSave = {
        ...setMetadata,
        serieId: serieId,
      };

      // Fetch and Save cards for this set
      if (cards) {
        console.log(`  Fetching ${cards.length} cards for set ${set.name}...`);

        // Create directory structure: apps/data/[serieId]/[setId]
        // We use serieId from the set details
        const serieDir = path.join(DATA_DIR, String(serieId));
        const setDir = path.join(serieDir, set.id);

        if (!fs.existsSync(serieDir))
          fs.mkdirSync(serieDir, { recursive: true });
        if (!fs.existsSync(setDir)) fs.mkdirSync(setDir, { recursive: true });

        let currentCard = 0;
        for (const cardRef of cards) {
          currentCard++;
          try {
            const cardDetails = await tcgdex.fetch("cards", cardRef.id);
            if (cardDetails) {
              // Save card to JSON file (no R2 upload for card images)
              const cardFilePath = path.join(setDir, `${cardRef.id}.json`);
              fs.writeFileSync(
                cardFilePath,
                JSON.stringify(cardDetails, null, 4),
              );
            }
          } catch (err) {
            console.error(`\nError fetching card ${cardRef.id}:`, err);
          }

          // Progress bar
          const total = cards.length;
          const percentage = Math.round((currentCard / total) * 100);
          const width = 40;
          const filled = Math.round((width * currentCard) / total);
          const empty = width - filled;
          const bar = "█".repeat(filled) + "░".repeat(empty);
          process.stdout.write(
            `\r  [${bar}] ${percentage}% (${currentCard}/${total})`,
          );

          // Add a small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 100));
        }
        process.stdout.write("\n"); // New line after progress bar completes
      }

      // Save set to local list ONLY after successfully processing all cards
      // This ensures that if the script crashes, we retry this set next time
      localSets.push(setToSave);
      fs.writeFileSync(SETS_FILE, JSON.stringify(localSets, null, 4));
    }
    console.log("Updated pokemon_sets.json");
  }

  console.log("Update complete!");
}

// ... imports ...

async function main() {
  try {
    await updateData();
  } catch (error) {
    console.error("An error occurred:");
    console.error(error);
    if (typeof error === "object" && error !== null) {
      console.error(JSON.stringify(error, null, 2));
    }
  }
}

main();
