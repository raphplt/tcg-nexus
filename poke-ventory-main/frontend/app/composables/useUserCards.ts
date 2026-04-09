import type { UserCard, UserCardsResponse, UserCardCreate } from "~/types/api";

/**
 * Composable pour gérer les cartes de l'utilisateur
 */
export const useUserCards = () => {
	const api = useApi();

	/**
	 * Récupérer les cartes de l'utilisateur avec pagination
	 */
	const getUserCards = (skip = 0, limit = 20, cardId?: string, setId?: string) => {
		const params = new URLSearchParams();
		params.append("skip", skip.toString());
		params.append("limit", limit.toString());
		if (cardId) params.append("card_id", cardId);
		if (setId) params.append("set_id", setId);

		return api.get<UserCardsResponse>(`/user-cards/?${params.toString()}`);
	};

	/**
	 * Ajouter une carte à la collection
	 */
	const addUserCard = async (userCard: UserCardCreate) => {
		return await api.post<UserCard>("/user-cards/", userCard);
	};

	/**
	 * Ajouter plusieurs cartes à la collection
	 */
	const addUserCardsBatch = async (userCards: UserCardCreate[]) => {
		return await api.post<{
			created: number;
			updated: number;
			errors: number;
			details: {
				created: string[];
				updated: string[];
				errors: Array<{ card_id: string; error: string }>;
			};
		}>("/user-cards/batch", userCards);
	};

	/**
	 * Mettre à jour une carte de la collection
	 */
	const updateUserCard = async (userCardId: string, updates: Partial<UserCardCreate>) => {
		return await api.put<UserCard>(`/user-cards/${userCardId}`, updates);
	};

	/**
	 * Supprimer une carte de la collection
	 */
	const deleteUserCard = async (userCardId: string) => {
		return await api.delete(`/user-cards/${userCardId}`);
	};

	return {
		getUserCards,
		addUserCard,
		addUserCardsBatch,
		updateUserCard,
		deleteUserCard,
	};
};

