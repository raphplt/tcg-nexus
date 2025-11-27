import { authedFetch } from "@/utils/fetch";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import {
  CreateTournamentDto,
  Match,
  Tournament,
  TournamentRegistration,
} from "@/types/tournament";

export interface TournamentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const tournamentService = {
  /**
   * Récupère un tournoi par son ID
   */
  async getById(tournamentId: string | number): Promise<Tournament> {
    return authedFetch<Tournament>("GET", `/tournaments/${tournamentId}`);
  },

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
   * Inscription à un tournoi
   */
  async register(
    tournamentId: number,
    playerId: number,
    notes?: string,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "POST",
      `/tournaments/${tournamentId}/register`,
      { body: { playerId, notes } },
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

  /**
   * Crée un tournoi
   */
  async create(payload: CreateTournamentDto): Promise<Tournament> {
    return authedFetch<Tournament>("POST", `/tournaments`, { body: payload });
  },

  /**
   * Récupère les tournois paginés
   */
  async getPaginated(
    params: TournamentQueryParams,
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>("GET", `/tournaments`, {
      params: params as any,
    });
  },
};
