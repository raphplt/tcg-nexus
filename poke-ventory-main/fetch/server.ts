import express, { Request, Response } from "express";
import TCGdex from "@tcgdex/sdk";
import { PokecardexService } from "./pokecardex.service.js";

class TcgDexService {
	private tcgdex: TCGdex;

	constructor() {
		this.tcgdex = new TCGdex("fr");
	}

	async getCardById(cardId: string): Promise<any> {
		try {
			const card = await this.tcgdex.fetch("cards", cardId);
			return card;
		} catch (error) {
			throw new Error("Carte non trouvée ou erreur avec l’API de TCGdex");
		}
	}

	async getSeries(): Promise<any> {
		try {
			const series = await this.tcgdex.fetch("series");
			return series;
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données des séries");
		}
	}

	async getSeriesDetails(): Promise<any> {
		try {
			const series = await this.tcgdex.fetch("series");
			if (!series) return [];
			const seriesPromises = series.map(async (serie: any) => {
				const seriesData = await this.tcgdex.fetch("series", serie.id);
				return seriesData;
			});

			const seriesDetails = await Promise.all(seriesPromises);

			return seriesDetails;
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données des séries");
		}
	}

	async getSeriesById(seriesId: string): Promise<any> {
		try {
			const series = await this.tcgdex.fetch("series", seriesId);
			return series;
		} catch (error) {
			throw new Error("Série non trouvée ou erreur avec l’API de TCGdex");
		}
	}

	async getSetById(setId: string): Promise<any> {
		try {
			const set = await this.tcgdex.fetch("sets", setId);
			return set;
		} catch (error) {
			throw new Error("Set non trouvé ou erreur avec l’API de TCGdex");
		}
	}

	async getSets(): Promise<any> {
		try {
			const sets = await this.tcgdex.fetch("sets");
			return sets;
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données des sets");
		}
	}

	async getAllSetsDetails(): Promise<any> {
		try {
			const sets = await this.tcgdex.fetch("sets");
			if (!sets) return [];
			const setsPromises = sets.map(async (set: any) => {
				const setData = await this.getSetById(set.id);
				const { cards, serie, ...setWithoutCardsAndSerie } = setData;
				return {
					...setWithoutCardsAndSerie,
					serieId: serie.id,
				};
			});

			const setsDetails = await Promise.all(setsPromises);

			return setsDetails;
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données des sets");
		}
	}

	async getSetWithCards(setId: string): Promise<any> {
		try {
			const setData = await this.tcgdex.fetch("sets", setId);
			if (!setData || !setData.cards) {
				throw new Error("Set non trouvé");
			}
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données du set");
		}
	}

	async getBloc(seriesId: string): Promise<any> {
		try {
			const series = await this.tcgdex.fetch("series", seriesId);
			if (!series || !series.sets) {
				throw new Error("Série non trouvée");
			}

			const setsPromises = series.sets.map(async (set: any) => {
				const setData = await this.tcgdex.fetch("sets", set.id);
				if (!setData || !setData.cards) return null;

				const cardsPromises = setData.cards.map(async (card: any) => {
					return await this.tcgdex.fetch("cards", card.id);
				});

				const cards = await Promise.all(cardsPromises);

				return {
					...setData,
					cards: cards.filter((card: any) => card !== null),
				};
			});

			const setsWithCards = await Promise.all(setsPromises);

			return {
				...series,
				sets: setsWithCards.filter((set: any) => set !== null),
			};
		} catch (error) {
			throw new Error("Erreur lors de la récupération des données de la série");
		}
	}

	async getAllCardsDetails(): Promise<any> {
		try {
			const cards = await this.tcgdex.fetch("cards");
			if (!cards) {
				return [];
			}

			const chunkSize = 1000;
			const delay = (ms: number) =>
				new Promise((resolve) => setTimeout(resolve, ms));

			const cardsDetails: any[] = [];
			for (let i = 0; i < cards.length; i += chunkSize) {
				const chunk = cards.slice(i, i + chunkSize);
				const cardsPromises = chunk.map(async (card: any) => {
					const cardData = await this.tcgdex.fetch("cards", card.id);
					return cardData;
				});

				const chunkDetails = await Promise.all(cardsPromises);
				cardsDetails.push(...chunkDetails);

				if (i + chunkSize < cards.length) {
					await delay(30000);
				}
			}

			return cardsDetails;
		} catch (error) {
			console.error("Error fetching cards details:", error);
			throw new Error("Erreur lors de la récupération des données des cartes");
		}
	}
}

// Initialisation d'Express
const app = express();
const port = process.env.PORT || 3005;
const tcgDexService = new TcgDexService();
const pokecardexService = new PokecardexService();

// Route pour lancer le scraping de Pokecardex
app.get("/pokecardex/scrape", async (req: Request, res: Response) => {
	try {
		// Run in background to avoid timeout
		pokecardexService.scrapeAll().then(() => {
			console.log("Scraping completed");
		}).catch(err => {
			console.error("Scraping failed", err);
		});
		
		res.json({ message: "Scraping started in background" });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Route pour tester le scraping d'une série spécifique
app.get("/pokecardex/series/:id/scrape", async (req: Request, res: Response) => {
	try {
		const items = await pokecardexService.scrapeSeriesItems(req.params.id);
		// Trigger downloads in background
		items.forEach(item => pokecardexService.downloadImage(item.imageUrl, item.localPath));
		
		res.json(items);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Route pour récupérer une carte par son ID
app.get("/tcgdex/cards/:id", async (req: Request, res: Response) => {
	try {
		const card = await tcgDexService.getCardById(req.params.id);
		res.json(card);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer toutes les séries
app.get("/tcgdex/series", async (req: Request, res: Response) => {
	try {
		const series = await tcgDexService.getSeries();
		res.json(series);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer toutes les séries et leurs détails
app.get("/tcgdex/seriesDetails", async (req: Request, res: Response) => {
	try {
		const series = await tcgDexService.getSeriesDetails();
		res.json(series);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer une série par son ID
app.get("/tcgdex/series/:id", async (req: Request, res: Response) => {
	try {
		const series = await tcgDexService.getSeriesById(req.params.id);
		res.json(series);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer un set par son ID
app.get("/tcgdex/sets/:id", async (req: Request, res: Response) => {
	try {
		const set = await tcgDexService.getSetById(req.params.id);
		res.json(set);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer tous les set
app.get("/tcgdex/sets", async (req: Request, res: Response) => {
	try {
		const set = await tcgDexService.getSets();
		res.json(set);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer tous les sets les détails
app.get("/tcgdex/setsDetails", async (req: Request, res: Response) => {
	try {
		const sets = await tcgDexService.getAllSetsDetails();
		res.json(sets);
	} catch (error: any) {
		res.status(404).json({ error: error.message });
	}
});

// Route pour récupérer un set avec toutes ses cartes détaillées
app.get("/tcgdex/setCard/:id", async (req: Request, res: Response) => {
	try {
		const setWithCards = await tcgDexService.getSetWithCards(req.params.id);
		res.json(setWithCards);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Route pour récupérer une série complète (bloc) avec tous ses sets et leurs cartes
app.get("/tcgdex/bloc/:id", async (req: Request, res: Response) => {
	try {
		const bloc = await tcgDexService.getBloc(req.params.id);
		res.json(bloc);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Route pour récupérer toutes les cartes détaillées
app.get("/tcgdex/cardsDetailed", async (req: Request, res: Response) => {
	try {
		const cards = await tcgDexService.getAllCardsDetails();
		res.json(cards);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Démarrage du serveur
app.listen(port, () => {
	console.log(`Fetch from TCGdex en écoute sur le port ${port}`);
});
