import { authedFetch } from "@/utils/fetch";
import { PaginationParams, PaginatedResult } from "@/types/pagination";
import {
  BracketStructure,
  CreateTournamentDto,
  Match,
  Ranking,
  StartTournamentOptions,
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

  /**
   * Récupère les tournois futurs
   */
  async getUpcomingTournaments(
    params: TournamentQueryParams,
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>(
      "GET",
      `/tournaments/upcoming`,
      {
        params: params as any,
      },
    );
  },

  /**
   * Récupère le bracket d'un tournoi
   */
  async getBracket(tournamentId: number): Promise<BracketStructure> {
    return authedFetch<BracketStructure>(
      "GET",
      `/tournaments/${tournamentId}/bracket`,
    );
  },

  /**
   * Récupère les paires d'un tournoi
   */
  async getPairings(tournamentId: number): Promise<Match[]> {
    return authedFetch<Match[]>("GET", `/tournaments/${tournamentId}/pairings`);
  },

  /**
   * Récupère les matches d'un tournoi
   */
  async getTournamentMatches(tournamentId: number): Promise<Match[]> {
    return authedFetch<Match[]>("GET", `/tournaments/${tournamentId}/matches`);
  },

  /**
   * Récupère les rankings d'un tournoi
   */
  async getRankings(tournamentId: number): Promise<Ranking[]> {
    return authedFetch<Ranking[]>(
      "GET",
      `/tournaments/${tournamentId}/rankings`,
    );
  },
  /**
   * Récupère la progression du tournoi
   */
  async getProgress(tournamentId: number): Promise<any> {
    return authedFetch<any>("GET", `/tournaments/${tournamentId}/progress`);
  },

  /**
   * Récupère les transitions disponibles
   */
  async getAvailableTransitions(
    tournamentId: number,
  ): Promise<{ availableTransitions: string[] }> {
    return authedFetch<{ availableTransitions: string[] }>(
      "GET",
      `/tournaments/${tournamentId}/transitions`,
    );
  },

  /**
   * Démarre le tournoi
   */
  async startTournament(
    tournamentId: number,
    options?: StartTournamentOptions,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/start`,
      { body: options },
    );
  },

  /**
   * Termine le tournoi
   */
  async finishTournament(tournamentId: number): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/finish`,
    );
  },

  /**
   * Annule le tournoi
   */
  async cancelTournament(
    tournamentId: number,
    reason?: string,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/cancel`,
      { body: { reason } },
    );
  },

  /**
   * Passe au round suivant
   */
  async advanceRound(
    tournamentId: number,
  ): Promise<{ newRound: number; matchesCreated: number }> {
    return authedFetch<{ newRound: number; matchesCreated: number }>(
      "POST",
      `/tournaments/${tournamentId}/advance-round`,
    );
  },

  /**
   * Met à jour le statut du tournoi
   */
  async updateStatus(
    tournamentId: number,
    status: string,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "PATCH",
      `/tournaments/${tournamentId}/status`,
      { body: { status } },
    );
  },
};
