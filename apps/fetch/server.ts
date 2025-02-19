import express, { Request, Response } from "express";
import TCGdex from "@tcgdex/sdk";

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

	async getSetWithCards(setId: string): Promise<any> {
		try {
			const setData = await this.tcgdex.fetch("sets", setId);
			if (!setData || !setData.cards) {
				throw new Error("Set non trouvé");
			}

			const cardsPromises = setData.cards.map(async (card: any) => {
				return await this.tcgdex.fetch("cards", card.id);
			});

			const cards = await Promise.all(cardsPromises);

			return {
				...setData,
				cards: cards.filter((card: any) => card !== null),
			};
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
}

// Initialisation d'Express
const app = express();
const port = process.env.PORT || 3005;
const tcgDexService = new TcgDexService();

// Route pour récupérer une carte par son ID
app.get("/tcgdex/cards/:id", async (req: Request, res: Response) => {
	try {
		const card = await tcgDexService.getCardById(req.params.id);
		res.json(card);
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

// Démarrage du serveur
app.listen(port, () => {
	console.log(`Fetch from TCGdex en écoute sur le port ${port}`);
});
