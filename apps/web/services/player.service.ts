import { Tournament } from "@/types/tournament";
import { authedFetch } from "@/utils/fetch";

export const playerService = {
  /**
   * Récupère les tournois d'un joueur via son playerId
   */
  async getTournamentsByPlayerId(playerId: number): Promise<Tournament[]> {
    return authedFetch<Tournament[]>("GET", `/player/${playerId}/tournaments`);
  },

  /**
   * Récupère les tournois liés à un utilisateur (user -> player -> tournaments)
   */
  async getTournamentsByUserId(userId: number): Promise<Tournament[]> {
    return authedFetch<Tournament[]>(
      "GET",
      `/player/user/${userId}/tournaments`,
    );
  },
};
