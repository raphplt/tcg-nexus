import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import TCGdex from "@tcgdex/sdk";
import AdmZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tcgdex = new TCGdex("fr");

const DATA_DIR = path.resolve(__dirname, "../api/src/common/data");
const SERIES_FILE = path.join(DATA_DIR, "pokemon_series.json");
const SETS_FILE = path.join(DATA_DIR, "pokemon_sets.json");
const CARDS_ZIP = path.join(DATA_DIR, "pokemon.zip");

async function updateData() {
	console.log("Starting data update...");

	// 1. Load local data
	console.log("Loading local data...");
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
	const newSeries = remoteSeries.filter(
		(s: any) =>
			!localSeriesIds.has(s.id) && !s.name.toLowerCase().includes("pocket")
	);
	console.log(`Local sets count: ${localSetsIds.size}`);
	console.log(`Remote sets count: ${remoteSets.length}`);
	console.log(`Has sv09 locally? ${localSetsIds.has("sv09")}`);
	const remoteSv09 = remoteSets.find((s: any) => s.id === "sv09");
	console.log(`Found sv09 remotely? ${!!remoteSv09}`);

	const newSets = remoteSets.filter((s: any) => {
		const isNew = !localSetsIds.has(s.id);
		const isPocketName = s.name.toLowerCase().includes("pocket");
		const isPocketSerie =
			s.serie && s.serie.name && s.serie.name.toLowerCase().includes("pocket");

		if (s.id === "sv09") {
			console.log(
				`Checking sv09: isNew=${isNew}, isPocketName=${isPocketName}, isPocketSerie=${isPocketSerie}`
			);
		}

		if (isNew && (isPocketName || isPocketSerie)) {
			console.log(`Filtering out Pocket set: ${s.name} (${s.id})`);
		}

		return isNew && !isPocketName && !isPocketSerie;
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
		const zip = new AdmZip(CARDS_ZIP);

		// Helper function to add card to zip
		const addCardToZip = (card: any) => {
			const content = JSON.stringify(card, null, 4);
			zip.addFile(`${card.id}.json`, Buffer.from(content, "utf8"));
		};

		for (const set of newSets) {
			console.log(`Processing set: ${set.name} (${set.id})...`);
			const setDetails = await tcgdex.fetch("sets", set.id);

			if (!setDetails) continue;

			// Prepare set data for pokemon_sets.json (removing cards list to match existing structure if needed,
			// but based on server.ts it seems we might want some details.
			// Let's look at existing pokemon_sets.json structure again.
			// It seems to contain cardCount, id, legal, name, releaseDate, etc.
			// The fetch('sets', id) returns details including cards.
			// We should probably strip 'cards' from the set object before saving to pokemon_sets.json
			// to keep it lightweight, as cards are in the zip.

			const { cards, serie, ...setMetadata } = setDetails;
			// We need to ensure the structure matches. The existing file has 'serieId'.
			// The SDK might return 'serie' object.
			const setToSave = {
				...setMetadata,
				serieId: serie.id || serie, // Handle if it's an object or ID
			};

			localSets.push(setToSave);

			// Fetch cards for this set
			if (cards) {
				console.log(`  Fetching ${cards.length} cards for set ${set.name}...`);
				for (const cardRef of cards) {
					const cardDetails = await tcgdex.fetch("cards", cardRef.id);
					if (cardDetails) {
						addCardToZip(cardDetails);
					}
					// Add a small delay to avoid rate limiting if necessary
					await new Promise((r) => setTimeout(r, 100));
				}
			}
		}

		fs.writeFileSync(SETS_FILE, JSON.stringify(localSets, null, 4));
		console.log("Updated pokemon_sets.json");

		zip.writeZip(CARDS_ZIP);
		console.log("Updated pokemon.zip with new cards");
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
