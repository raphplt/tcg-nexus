import { PaginatedResult, PaginationParams } from "@/types/pagination";
import {
  BracketStructure,
  CreateTournamentDto,
  Match,
  Ranking,
  StartTournamentOptions,
  Tournament,
  TournamentRegistration,
} from "@/types/tournament";
import { authedFetch } from "@/utils/fetch";

export interface TournamentQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface MyPendingTournamentMatch {
  matchId: number;
  round: number;
  phase: string;
  status: string;
  playerA: { id: number; name: string | null } | null;
  playerB: { id: number; name: string | null } | null;
  onlineSession: { id: number; status: string } | null;
}

export type BulkRegistrationAction = "confirm" | "cancel" | "check_in";

export interface BulkRegistrationActionResult {
  action: BulkRegistrationAction;
  updatedCount: number;
  registrations: TournamentRegistration[];
  promotedCount: number;
  promotedRegistrations: TournamentRegistration[];
}

export const tournamentService = {
  /**
   * Retrieves a tournament by its identifier.
   */
  async getById(tournamentId: string | number): Promise<Tournament> {
    return authedFetch<Tournament>("GET", `/tournaments/${tournamentId}`);
  },

  /**
   * Retrieves a player's tournaments.
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
   * Retrieves tournaments organized by a specific user.
   */
  async getOrganizerTournaments(
    userId: number,
    params: TournamentQueryParams = {},
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>(
      "GET",
      `/tournaments/organizer/${userId}`,
      { params: params as any },
    );
  },

  /**
   * Retrieves a tournament match.
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
   * Returns the user's currently pending match in this tournament, or null.
   */
  async getMyPendingMatch(
    tournamentId: number | string,
  ): Promise<MyPendingTournamentMatch | null> {
    return authedFetch<MyPendingTournamentMatch | null>(
      "GET",
      `/tournaments/${tournamentId}/matches/me`,
    );
  },

  /**
   * Retrieves tournament registrations.
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
   * Registers the current user for a tournament.
   */
  async register(
    tournamentId: number,
    notes?: string,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "POST",
      `/tournaments/${tournamentId}/register`,
      { data: { notes } },
    );
  },

  /**
   * Leaves a tournament or its waiting list.
   */
  async unregister(tournamentId: number, playerId: number): Promise<void> {
    return authedFetch<void>(
      "DELETE",
      `/tournaments/${tournamentId}/register/${playerId}`,
    );
  },

  /**
   * Confirms a registration.
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
   * Cancels a registration.
   */
  async cancelRegistration(
    tournamentId: number,
    registrationId: number,
    reason?: string,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/cancel`,
      { data: { reason } },
    );
  },

  async updateRegistrationsInBulk(
    tournamentId: number,
    data: {
      registrationIds: number[];
      action: BulkRegistrationAction;
      reason?: string;
    },
  ): Promise<BulkRegistrationActionResult> {
    return authedFetch<BulkRegistrationActionResult>(
      "POST",
      `/tournaments/${tournamentId}/registrations/bulk-action`,
      { data },
    );
  },

  /**
   * Checks in a player.
   */
  async checkIn(
    tournamentId: number,
    registrationId: number,
  ): Promise<TournamentRegistration> {
    return authedFetch<TournamentRegistration>(
      "PATCH",
      `/tournaments/${tournamentId}/registrations/${registrationId}/check-in`,
    );
  },

  /**
   * Creates a tournament.
   */
  async create(payload: CreateTournamentDto): Promise<Tournament> {
    return authedFetch<Tournament>("POST", `/tournaments`, { data: payload });
  },

  /**
   * Retrieves paginated tournaments.
   */
  async getPaginated(
    params: TournamentQueryParams,
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>("GET", `/tournaments`, {
      params: params as any,
    });
  },

  /**
   * Retrieves upcoming tournaments.
   */
  async getUpcomingTournaments(
    params: TournamentQueryParams,
  ): Promise<Tournament[]> {
    return authedFetch<Tournament[]>("GET", `/tournaments/upcoming`, {
      params: params as any,
    });
  },

  /**
   * Retrieves past tournaments.
   */
  async getPastTournaments(
    params: TournamentQueryParams,
  ): Promise<Tournament[]> {
    return authedFetch<Tournament[]>("GET", `/tournaments/past`, {
      params: params as any,
    });
  },

  /**
   * Retrieves a tournament bracket.
   */
  async getBracket(tournamentId: number): Promise<BracketStructure> {
    return authedFetch<BracketStructure>(
      "GET",
      `/tournaments/${tournamentId}/bracket`,
    );
  },

  /**
   * Retrieves tournament matches.
   */
  async getTournamentMatches(tournamentId: number): Promise<Match[]> {
    const result = await authedFetch<{
      matches: Match[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("GET", `/tournaments/${tournamentId}/matches`, {
      params: { page: 1, limit: 1000 },
    });

    return result.matches;
  },

  /**
   * Retrieves tournament rankings.
   */
  async getRankings(tournamentId: number): Promise<Ranking[]> {
    return authedFetch<Ranking[]>(
      "GET",
      `/tournaments/${tournamentId}/rankings`,
    );
  },
  /**
   * Retrieves tournament progress.
   */
  async getProgress(tournamentId: number): Promise<any> {
    return authedFetch<any>("GET", `/tournaments/${tournamentId}/progress`);
  },

  /**
   * Retrieves available state transitions.
   */
  async getAvailableTransitions(
    tournamentId: number,
  ): Promise<{ availableTransitions: string[] }> {
    return authedFetch<{ availableTransitions: string[] }>(
      "GET",
      `/tournaments/${tournamentId}/state/transitions`,
    );
  },

  /**
   * Starts the tournament.
   */
  async startTournament(
    tournamentId: number,
    options?: StartTournamentOptions,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/start`,
      { data: options },
    );
  },

  /**
   * Finishes the tournament.
   */
  async finishTournament(tournamentId: number): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/finish`,
    );
  },

  /**
   * Cancels the tournament.
   */
  async cancelTournament(
    tournamentId: number,
    reason?: string,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "POST",
      `/tournaments/${tournamentId}/cancel`,
      { data: { reason } },
    );
  },

  /**
   * Advances the tournament to the next round.
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
   * Updates tournament status.
   */
  async updateStatus(
    tournamentId: number,
    status: string,
  ): Promise<Tournament> {
    return authedFetch<Tournament>(
      "PATCH",
      `/tournaments/${tournamentId}/status`,
      { data: { status } },
    );
  },

  /**
   * Fills the tournament with random players (admin only).
   */
  async fillWithPlayers(
    tournamentId: number,
    count: number = 8,
  ): Promise<{ registeredCount: number }> {
    return authedFetch<{ registeredCount: number }>(
      "POST",
      `/tournaments/${tournamentId}/fill-with-players`,
      { data: { count } },
    );
  },

  /**
   * Checks in all confirmed players (admin only).
   */
  async checkInAllPlayers(
    tournamentId: number,
  ): Promise<{ checkedInCount: number }> {
    return authedFetch<{ checkedInCount: number }>(
      "POST",
      `/tournaments/${tournamentId}/check-in-all`,
    );
  },

  /**
   * Updates a match score or status.
   */
  async updateMatch(
    tournamentId: number,
    matchId: number,
    data: { playerAScore?: number; playerBScore?: number; status?: string },
  ): Promise<Match> {
    return authedFetch<Match>(
      "PATCH",
      `/tournaments/${tournamentId}/matches/${matchId}`,
      { data },
    );
  },

  async startMatchesInBulk(
    tournamentId: number,
    matchIds: number[],
  ): Promise<{ startedCount: number; matches: Match[] }> {
    return authedFetch<{ startedCount: number; matches: Match[] }>(
      "POST",
      `/tournaments/${tournamentId}/matches/bulk-start`,
      { data: { matchIds } },
    );
  },
};
