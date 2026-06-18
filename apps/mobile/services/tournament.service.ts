import { api } from "./api";
import type { PaginatedResponse, Tournament, TournamentQueryDto } from "@/types";

export const tournamentService = {
  /**
   * Récupère la liste des tournois avec filtres et pagination
   */
  async getTournaments(query?: TournamentQueryDto): Promise<PaginatedResponse<Tournament>> {
    const response = await api.get<PaginatedResponse<Tournament>>("/tournaments", {
      params: query,
    });
    return response.data;
  },

  /**
   * Récupère les tournois à venir
   */
  async getUpcomingTournaments(limit: number = 10): Promise<Tournament[]> {
    const response = await api.get<Tournament[]>("/tournaments/upcoming", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Récupère les tournois passés
   */
  async getPastTournaments(limit: number = 10): Promise<Tournament[]> {
    const response = await api.get<Tournament[]>("/tournaments/past", {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Récupère les détails d'un tournoi par son ID
   */
  async getTournamentById(id: number): Promise<Tournament> {
    const response = await api.get<Tournament>(`/tournaments/${id}`);
    return response.data;
  },

  /**
   * Récupère les statistiques d'un tournoi
   */
  async getTournamentStats(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/stats`);
    return response.data;
  },

  /**
   * Récupère le bracket d'un tournoi
   */
  async getBracket(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/bracket`);
    return response.data;
  },

  /**
   * Récupère les matchs d'un tournoi
   */
  async getTournamentMatches(id: number, round?: number, status?: string): Promise<any> {
    const response = await api.get(`/tournaments/${id}/matches`, {
      params: { round, status },
    });
    return response.data;
  },

  /**
   * Récupère le classement d'un tournoi
   */
  async getTournamentRankings(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/rankings`);
    return response.data;
  },

  /**
   * Récupère le match en attente de l'utilisateur courant pour ce tournoi
   */
  async getMyPendingMatch(id: number): Promise<any> {
    const response = await api.get(`/tournaments/${id}/matches/me`);
    return response.data;
  },

  /**
   * Crée un nouveau tournoi (Admin uniquement)
   */
  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const response = await api.post<Tournament>("/tournaments", data);
    return response.data;
  },

  /**
   * Récupère les tournois d'un joueur
   */
  async getPlayerTournaments(playerId: number, query?: TournamentQueryDto): Promise<PaginatedResponse<Tournament>> {
    const response = await api.get<PaginatedResponse<Tournament>>(`/tournaments/player/${playerId}`, {
      params: query,
    });
    return response.data;
  },

  /**
   * Inscrit le joueur connecté au tournoi
   */
  async registerTournament(tournamentId: number, playerId: number, notes?: string): Promise<any> {
    const response = await api.post(`/tournaments/${tournamentId}/register`, {
      playerId,
      notes,
    });
    return response.data;
  },

  /**
   * Met à jour le statut d'un tournoi (Admin uniquement)
   */
  async updateTournamentStatus(id: number, status: string): Promise<Tournament> {
    const response = await api.patch<Tournament>(`/tournaments/${id}/status`, {
      status,
    });
    return response.data;
  },
};
