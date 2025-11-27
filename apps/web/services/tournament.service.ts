import { authedFetch } from "@/utils/fetch";
import { PaginationParams, PaginatedResult } from "@/types/pagination";

export interface Tournament {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  location: string;
  maxPlayers: number;
  currentPlayers: number;
  image?: string;
  pricing?: {
    entryFee: number;
    currency: string;
  };
  rewards?: {
    type: string;
    value: string;
  }[];
}

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
};
