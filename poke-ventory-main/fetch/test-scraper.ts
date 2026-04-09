import { PokecardexService } from "./pokecardex.service.js";

async function test() {
	const service = new PokecardexService();
	
	console.log("Testing fetchSeriesList...");
	const seriesList = await service.fetchSeriesList();
	console.log(`Found ${seriesList.length} series.`);
	if (seriesList.length > 0) {
		console.log("First series:", seriesList[0]);
	}

	console.log("\nTesting scrapeSeriesItems for 'SFA'...");
	const items = await service.scrapeSeriesItems("SFA");
	console.log(`Found ${items.length} items in SFA.`);
	
	if (items.length > 0) {
		console.log("First item:", items[0]);
		
		console.log("\nTesting downloadImage...");
		await service.downloadImage(items[0].imageUrl, items[0].localPath);
		console.log(`Downloaded image to ${items[0].localPath}`);
	}
}

test().catch(console.error);
