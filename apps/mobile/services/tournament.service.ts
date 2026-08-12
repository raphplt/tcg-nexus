import { api } from "./api";
import type {
  PaginatedResponse,
  Tournament,
  TournamentQueryDto,
} from "@/types";

export const tournamentService = {
  /**
   * Retrieves tournaments with filters and pagination.
   */
  async getTournaments(
    query?: TournamentQueryDto,
  ): Promise<PaginatedResponse<Tournament>> {
    const response = await api.get<PaginatedResponse<Tournament>>(
      "/tournaments",
      {
        params: query,
      },
    );
    return response.data;
  },

  /**
   * Retrieves upcoming tournaments.
   */
  async getUpcomingTournaments(limit: number = 10): Promise<Tournament[]> {
    const response = await api.get<Tournament[]>("/tournaments/upcoming", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Retrieves past tournaments.
   */
  async getPastTournaments(limit: number = 10): Promise<Tournament[]> {
    const response = await api.get<Tournament[]>("/tournaments/past", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Retrieves tournament details by identifier.
   */
  async getTournamentById(id: number): Promise<Tournament> {
    const response = await api.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },

  /**
   * Retrieves tournament statistics.
   */
  async getTournamentStats(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/stats`);
    return response.data;
  },

  /**
   * Retrieves a tournament bracket.
   */
  async getBracket(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/bracket`);
    return response.data;
  },

  /**
   * Retrieves tournament matches.
   */
  async getTournamentMatches(
    id: number,
    round?: number,
    status?: string,
  ): Promise<any> {
    const response = await api.get(`/tournaments/${id}/matches`, {
      params: { round, status },
    });
    return response.data;
  },

  /**
   * Retrieves tournament rankings.
   */
  async getTournamentRankings(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/rankings`);
    return response.data;
  },

  /**
   * Retrieves the current user's pending tournament match.
   */
  async getMyPendingMatch(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/matches/me`);
    return response.data;
  },

  /**
   * Creates a new tournament (administrators only).
   */
  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const response = await api.post<Tournament>("/tournaments", data);
    return response.data;
  },

  /**
   * Retrieves a player's tournaments.
   */
  async getPlayerTournaments(
    playerId: number,
    query?: TournamentQueryDto,
  ): Promise<PaginatedResponse<Tournament>> {
    const response = await api.get<PaginatedResponse<Tournament>>(
      `/tournaments/player/${playerId}`,
      {
        params: query,
      },
    );
    return response.data;
  },

  /**
   * Registers the current player for a tournament.
   */
  async registerTournament(
    tournamentId: number,
    playerId: number,
    notes?: string,
  ): Promise<any> {
    const response = await api.post(`/tournaments/${tournamentId}/register`, {
      playerId,
      notes,
    });
    return response.data;
  },

  /**
   * Updates a tournament status (administrators only).
   */
  async updateTournamentStatus(
    id: number,
    status: string,
  ): Promise<Tournament> {
    const response = await api.patch<Tournament>(`/tournaments/${id}/status`, {
      status,
    });
    return response.data;
  },
};
