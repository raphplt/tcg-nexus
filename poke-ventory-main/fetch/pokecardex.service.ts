import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs-extra";
import path from "path";

export class PokecardexService {
	private baseUrl = "https://www.pokecardex.com";
	private downloadDir = path.join(process.cwd(), "downloads", "pokecardex");

	constructor() {
		fs.ensureDirSync(this.downloadDir);
	}

	async fetchSeriesList(): Promise<{ id: string; name: string }[]> {
		try {
			// We can fetch the main page or any series page to get the sidebar
			const response = await axios.get(`${this.baseUrl}/series/SFA/decks`);
			const $ = cheerio.load(response.data);
			const seriesList: { id: string; name: string }[] = [];

			// The sidebar structure based on the provided HTML
			// It seems series are in .menu-serie-bloc
			// We need to iterate over them.
			// However, the provided HTML shows a complex structure with collapses.
			// A simpler way might be to look for links like /series/CODE
			
			// Let's try to find all links in the sidebar that match /series/CODE
			// The sidebar seems to be in .col-sm-3 (d-none d-lg-block)
			
			$(".menu-serie-container a").each((_, element) => {
				const href = $(element).attr("href");
				if (href && href.includes("/series/")) {
					const parts = href.split("/");
					const id = parts[parts.length - 1];
					const name = $(element).find(".nom_ext").text().trim();
					
					if (id && name) {
						seriesList.push({ id, name });
					}
				}
			});

			return seriesList;
		} catch (error) {
			console.error("Error fetching series list:", error);
			throw new Error("Failed to fetch series list");
		}
	}

	async scrapeSeriesItems(seriesId: string): Promise<any[]> {
		// Try the /decks page as it seems to contain sealed items
		const url = `${this.baseUrl}/series/${seriesId}/decks`;
		console.log(`Scraping URL: ${url}`);
		try {
			const response = await axios.get(url);
			const $ = cheerio.load(response.data);
			const items: any[] = [];

			// Extract Set Name from the logo alt text
			// Use a simpler selector
			const setLogoImg = $("img.serie-logo-big");
			const setName = setLogoImg.attr("alt") || "Unknown Set";
			console.log(`Detected Set Name: ${setName}`);

			// Scrape items
			// Look for headers (h3) and then grab all images until the next h3
			$("h3").each((_, header) => {
				const sectionTitle = $(header).text().trim();
				console.log(`Found section: ${sectionTitle}`);
				
				let productType = "unknown";
				if (sectionTitle.includes("Booster")) productType = "booster";
				else if (sectionTitle.includes("Deck")) productType = "deck";
				else if (sectionTitle.includes("Portfolio")) productType = "portfolio";
				else if (sectionTitle.includes("Coffret")) productType = "box";
				else if (sectionTitle.includes("Tin")) productType = "tin";
				else if (sectionTitle.includes("ETB") || sectionTitle.includes("Elite Trainer Box")) productType = "etb";

				// Get all elements between this h3 and the next h3
				const sectionContent = $(header).nextUntil("h3");
				
				// Find all images within this content
				sectionContent.find("img").each((_, imgEl) => {
					const img = $(imgEl);
					const imgSrc = img.attr("src");
					const imgAlt = img.attr("alt");
					
					// Filter out small icons or irrelevant images if possible
					// For now, we assume images in these sections are products
					if (imgSrc && !imgSrc.includes("icon") && !imgSrc.includes("symboles")) {
						const filename = path.basename(imgSrc);
						const localPath = path.join(this.downloadDir, seriesId, filename);
						
						items.push({
							seriesId,
							setName,
							name: imgAlt || `${setName} - ${productType}`,
							productType,
							imageUrl: imgSrc.startsWith("http") ? imgSrc : `${this.baseUrl}${imgSrc}`,
							localPath
						});
					}
				});
			});

			return items;
		} catch (error) {
			console.error(`Error scraping series ${seriesId}:`, error);
			return [];
		}
	}

	async downloadImage(url: string, localPath: string): Promise<void> {
		try {
			if (fs.existsSync(localPath)) return; // Skip if exists

			const response = await axios({
				url,
				method: "GET",
				responseType: "stream",
			});

			fs.ensureDirSync(path.dirname(localPath));
			const writer = fs.createWriteStream(localPath);

			response.data.pipe(writer);

			return new Promise((resolve, reject) => {
				writer.on("finish", resolve);
				writer.on("error", reject);
			});
		} catch (error) {
			console.error(`Failed to download image from ${url}:`, error);
		}
	}

	async scrapeAll(): Promise<any> {
		const seriesList = await this.fetchSeriesList();
		const allItems = [];

		for (const series of seriesList) {
			console.log(`Scraping series: ${series.name} (${series.id})`);
			const items = await this.scrapeSeriesItems(series.id);
			
			for (const item of items) {
				await this.downloadImage(item.imageUrl, item.localPath);
			}
			
			allItems.push(...items);
		}

		return allItems;
	}
}
