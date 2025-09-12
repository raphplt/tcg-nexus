import type { PaginationParams, PaginatedResult } from "@/types/pagination";
import { CreateTournamentDto, Tournament } from "@/types/tournament";
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
};
