import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import {
  CreateTournamentDto,
  Tournament,
  BracketStructure,
  SwissPairing,
  TournamentProgress,
  TournamentRegistration,
  StateTransition,
  StartTournamentOptions,
  Match,
  Ranking,
} from "@/types/tournament";
import { authedFetch, fetcher } from "@/utils/fetch";

export interface TournamentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  type?: string;
  location?: string;
  isPublic?: boolean;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export const tournamentService = {
  /**
   * Récupère les tournois paginés avec filtres et tri
   * @param params Query params (page, limit, search, status, type, location, isPublic, sortBy, sortOrder)
   */
  async getPaginated(
    params: TournamentQueryParams = {},
  ): Promise<PaginatedResult<Tournament>> {
    return fetcher<PaginatedResult<Tournament>>("/tournaments", { params });
  },

  async getUpcomingTournaments(limit: number = 3): Promise<Tournament[]> {
    return fetcher<Tournament[]>("/tournaments/upcoming", {
      params: { limit },
    });
  },

  async create(data: CreateTournamentDto): Promise<Tournament> {
    return authedFetch<Tournament>("POST", "/tournaments", {
      data,
    });
  },

  async register(
    tournamentId: number,
    playerId: number,
    notes?: string,
  ): Promise<void> {
    await authedFetch<void>("POST", `/tournaments/${tournamentId}/register`, {
      data: { playerId, notes },
    });
  },

  async getById(id: string): Promise<Tournament> {
    return fetcher<Tournament>(`/tournaments/${id}`);
  },
  async getMyTournaments(): Promise<Tournament[]> {
    return await authedFetch("GET", "/tournaments/my-tournaments")
  },

  // ============= TOURNAMENT STATE MANAGEMENT =============

  async updateStatus(id: number, status: string): Promise<Tournament> {
    return authedFetch<Tournament>("PATCH", `/tournaments/${id}/status`, {
      data: { status },
    });
  },

  async startTournament(
    id: number,
    options?: StartTournamentOptions,
  ): Promise<Tournament> {
    return authedFetch<Tournament>("POST", `/tournaments/${id}/start`, {
      data: options || {},
    });
  },

  async finishTournament(id: number): Promise<Tournament> {
    return authedFetch<Tournament>("POST", `/tournaments/${id}/finish`);
  },

  async cancelTournament(id: number, reason?: string): Promise<Tournament> {
    return authedFetch<Tournament>("POST", `/tournaments/${id}/cancel`, {
      data: { reason },
    });
  },

  async advanceRound(
    id: number,
  ): Promise<{ newRound: number; matchesCreated: number }> {
    return authedFetch("POST", `/tournaments/${id}/advance-round`);
  },

  // ============= BRACKET & PAIRINGS =============

  async getBracket(id: number): Promise<BracketStructure> {
    return fetcher<BracketStructure>(`/tournaments/${id}/bracket`);
  },

  async getPairings(
    id: number,
    round?: number,
  ): Promise<SwissPairing | Match[]> {
    const params = round ? { round } : {};
    return fetcher(`/tournaments/${id}/pairings`, { params });
  },

  async getRankings(id: number): Promise<Ranking[]> {
    return fetcher<Ranking[]>(`/tournaments/${id}/rankings`);
  },

  async getProgress(id: number): Promise<TournamentProgress> {
    return fetcher<TournamentProgress>(`/tournaments/${id}/progress`);
  },

  // ============= MATCH MANAGEMENT =============

  async getTournamentMatches(
    id: number,
    filters?: { round?: number; status?: string },
  ): Promise<PaginatedResult<Match>> {
    return fetcher<PaginatedResult<Match>>(`/tournaments/${id}/matches`, {
      params: filters,
    });
  },

  async getTournamentMatch(
    tournamentId: number,
    matchId: number,
  ): Promise<Match> {
    return fetcher<Match>(`/tournaments/${tournamentId}/matches/${matchId}`);
  },

  // ============= REGISTRATION MANAGEMENT =============

  async getRegistrations(
    id: number,
    status?: string,
  ): Promise<TournamentRegistration[]> {
    const params = status ? { status } : {};
    return authedFetch<TournamentRegistration[]>(
      "GET",
      `/tournaments/${id}/registrations`,
      { params },
    );
  },

  async confirmRegistration(
    tournamentId: number,
    registrationId: number,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/confirm`,
    );
  },

  async cancelRegistration(
    tournamentId: number,
    registrationId: number,
    reason?: string,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/cancel`,
      {
        data: { reason },
      },
    );
  },

  async checkIn(
    tournamentId: number,
    registrationId: number,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/check-in`,
    );
  },

  // ============= STATE VALIDATION =============

  async getAvailableTransitions(id: number): Promise<StateTransition> {
    return fetcher<StateTransition>(`/tournaments/${id}/state/transitions`);
  },

  async validateTransition(
    id: number,
    targetStatus: string,
  ): Promise<{ canTransition: boolean; errors: string[]; warnings: string[] }> {
    return authedFetch("POST", `/tournaments/${id}/state/validate`, {
      data: { targetStatus },
    });
  },

  // ============= PLAYER TOURNAMENTS =============

  async getPlayerTournaments(playerId: number): Promise<Tournament[]> {
    return fetcher<Tournament[]>(`/players/${playerId}/tournaments`);
  },
};
