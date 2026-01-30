import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import TCGdex from "@tcgdex/sdk";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tcgdex = new TCGdex("fr");

const DATA_DIR = path.resolve(__dirname, "../../data");
const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");
const SETS_FILE = path.join(DATA_DIR, "pokemon_sets.json");

// 12: const DATA_DIR = path.resolve(__dirname, "../../data");
// 13: const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");
// 14: const SETS_FILE = path.join(DATA_DIR, "pokemon_sets.json");
// ...
async function updateData() {
	console.log("Starting data update...");

	// Ensure data directory exists
	if (!fs.existsSync(DATA_DIR)) {
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
						.map((s: any) => s.id)
				);

	const newSeries = remoteSeries.filter(
		(s: any) => !localSeriesIds.has(s.id) && !pocketSeriesIds.has(s.id)
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
		`Found ${newSeries.length} new series and ${newSets.length} new sets.`
	);

	if (newSeries.length === 0 && newSets.length === 0) {
		console.log("No new data to update.");
		return;
	}

	// 4. Fetch details for new series
	if (newSeries.length > 0) {
		console.log("Fetching details for new series...");
		for (const serie of newSeries) {
			const details = await tcgdex.fetch("series", serie.id);
			if (details) {
				localSeries.push(details);
				console.log(`Added series: ${serie.name}`);
			}
		}
		fs.writeFileSync(SERIES_FILE, JSON.stringify(localSeries, null, 4));
		console.log("Updated pokemon_series.json");
	}

	// 5. Fetch details for new sets and their cards
	if (newSets.length > 0) {
		console.log("Fetching details for new sets...");

		for (const set of newSets) {
			console.log(`Processing set: ${set.name} (${set.id})...`);
			const setDetails = await tcgdex.fetch("sets", set.id);

			if (!setDetails) continue;

			// Prepare set metadata
			const { cards, serie, ...setMetadata } = setDetails;
			const serieId = serie.id || serie; // Handle if it's an object or ID
			
			const setToSave = {
				...setMetadata,
				serieId: serieId, 
			};

			localSets.push(setToSave);

			// Fetch and Save cards for this set
			if (cards) {
				console.log(`  Fetching ${cards.length} cards for set ${set.name}...`);
				
				// Create directory structure: apps/data/[serieId]/[setId]
                // We use serieId from the set details
				const serieDir = path.join(DATA_DIR, String(serieId));
				const setDir = path.join(serieDir, set.id);

				if (!fs.existsSync(serieDir)) fs.mkdirSync(serieDir, { recursive: true });
				if (!fs.existsSync(setDir)) fs.mkdirSync(setDir, { recursive: true });

				for (const cardRef of cards) {
					const cardDetails = await tcgdex.fetch("cards", cardRef.id);
					if (cardDetails) {
						// Save card to JSON file
						const cardFilePath = path.join(setDir, `${cardRef.id}.json`);
						fs.writeFileSync(cardFilePath, JSON.stringify(cardDetails, null, 4));
					}
					// Add a small delay to avoid rate limiting
					await new Promise((r) => setTimeout(r, 100));
				}
			}
		}

		fs.writeFileSync(SETS_FILE, JSON.stringify(localSets, null, 4));
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
