import type { Card, CardFilters, CardsResponse, Series, Set } from "~/types/api";

/**
 * Composable pour gérer les cartes Pokémon
 */
export const useCards = () => {
	const api = useApi();

	/**
	 * Récupérer la liste des cartes avec filtres et pagination
	 */
	const getCards = (filters?: CardFilters) => {
		const params = new URLSearchParams();

		const appendParam = (key: string, value: string | string[] | number | undefined) => {
			if (value === undefined || value === null || value === "") return;
			if (Array.isArray(value)) {
				value.forEach((v) => params.append(key, v.toString()));
			} else {
				params.append(key, value.toString());
			}
		};

		appendParam("set_id", filters?.set_id);
		appendParam("series_id", filters?.series_id);
		appendParam("name", filters?.name);
		appendParam("rarity", filters?.rarity);
		appendParam("category", filters?.category);
		appendParam("type", filters?.type);
		appendParam("stage", filters?.stage);
		appendParam("local_id", filters?.local_id);
		appendParam("skip", filters?.skip);
		appendParam("limit", filters?.limit);

		const queryString = params.toString();
		const url = queryString ? `/cards/?${queryString}` : "/cards/";

		return api.get<CardsResponse>(url);
	};

	/**
	 * Récupérer toutes les séries
	 */
	const getSeries = () => {
		return api.get<Series[]>("/series/");
	};

	/**
	 * Récupérer tous les sets
	 */
	const getSets = (seriesId?: string | string[]) => {
		const params = new URLSearchParams();
		if (seriesId) {
			if (Array.isArray(seriesId)) {
				seriesId.forEach((id) => params.append("series_id", id));
			} else {
				params.append("series_id", seriesId);
			}
		}
		const queryString = params.toString();
		const url = queryString ? `/sets/?${queryString}` : "/sets/";
		return api.get<Set[]>(url);
	};

	/**
	 * Récupérer une carte par son ID
	 */
	const getCard = (cardId: string) => {
		return api.get<Card>(`/cards/${cardId}`);
	};

	/**
	 * Créer une carte
	 */
	const createCard = async (card: Partial<Card>) => {
		return await api.post<Card>("/cards/", card);
	};

	/**
	 * Mettre à jour une carte
	 */
	const updateCard = async (cardId: string, card: Partial<Card>) => {
		return await api.put<Card>(`/cards/${cardId}`, card);
	};

	/**
	 * Supprimer une carte
	 */
	const deleteCard = async (cardId: string) => {
		return await api.delete(`/cards/${cardId}`);
	};

	return {
		getCards,
		getCard,
		createCard,
		updateCard,
		deleteCard,
		getSeries,
		getSets,
	};
};
