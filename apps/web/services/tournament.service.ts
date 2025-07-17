import type { PaginationParams, PaginatedResult } from "@/type/pagination";
import { fetcher } from "@/utils/fetch";

export interface Tournament {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: string;
  status: string;
  // Ajoute d'autres champs si besoin
}

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
};
