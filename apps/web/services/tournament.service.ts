import { authedFetch } from "@/utils/fetch";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import { Match, Tournament, TournamentRegistration } from "@/types/tournament";

export interface TournamentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const tournamentService = {
  /**
   * Récupère les tournois d'un joueur
   */
  async getPlayerTournaments(
    playerId: number,
    params: TournamentQueryParams = {},
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>(
      "GET",
      `/tournaments/player/${playerId}`,
      { params: params as any },
    );
  },

  /**
   * Récupère un match d'un tournoi
   */
  async getTournamentMatch(
    tournamentId: number,
    matchId: number,
  ): Promise<Match> {
    return authedFetch<Match>(
      "GET",
      `/tournaments/${tournamentId}/matches/${matchId}`,
    );
  },

  /**
   * Récupère les inscriptions d'un tournoi
   */
  async getRegistrations(
    tournamentId: number,
  ): Promise<TournamentRegistration[]> {
    return authedFetch<TournamentRegistration[]>(
      "GET",
      `/tournaments/${tournamentId}/registrations`,
    );
  },

  /**
   * Confirme une inscription
   */
  async confirmRegistration(
    tournamentId: number,
    registrationId: number,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/confirm`,
    );
  },

  /**
   * Annule une inscription
   */
  async cancelRegistration(
    tournamentId: number,
    registrationId: number,
    reason?: string,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/cancel`,
      { body: { reason } },
    );
  },

  /**
   * Effectue le check-in d'un joueur
   */
  async checkIn(
    tournamentId: number,
    registrationId: number,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/checkin`,
    );
  },
};
