import { Injectable } from "@nestjs/common";
import { Match, MatchStatus } from "../../match/entities/match.entity";

/** Outcome of an already-played match, as consumed by the pairing engine. */
export interface SwissMatchResult {
  playerAId: number;
  playerBId?: number;
  winnerId?: number;
  playerAScore?: number;
  playerBScore?: number;
  isBye?: boolean;
}

/** One Swiss standings row, tie-breakers included. */
export interface SwissStanding {
  playerId: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  opponentIds: number[];
  /** Opponent Match Win percentage (floored at 33% per opponent). */
  opponentMatchWinRate: number;
  /** Player's own Game Win percentage. */
  gameWinRate: number;
  /** Opponent Game Win percentage. */
  opponentGameWinRate: number;
}

/** Pairing proposed for a round. */
export interface SwissPairing {
  playerAId: number;
  playerBId?: number;
  isBye: boolean;
}

const WIN_POINTS = 3;
const DRAW_POINTS = 1;
const LOSS_POINTS = 0;

/**
 * Floor applied to opponent percentages, as in the official rules: an opponent
 * who lost everything still counts for 33%, otherwise facing a struggling
 * player would penalise the standings far too heavily.
 */
const MIN_OPPONENT_RATE = 1 / 3;

/**
 * Backtracking guard: past this budget we assume no rematch-free pairing is
 * reachable in reasonable time and fall back to the linear pass rather than
 * exploring a factorial search space.
 */
const MAX_PAIRING_STEPS = 50_000;

/**
 * Swiss system pairing engine.
 *
 * Pure computation service: it neither reads nor writes the database, which
 * makes it usable both from the tournament orchestration and from the
 * automatic progression triggered by a reported score.
 */
@Injectable()
export class SwissPairingService {
  /**
   * Recommended round count for a given field size.
   *
   * Uses the next power of two, with a floor of three rounds, which is the
   * common practice in trading card games.
   *
   * @param playerCount - Number of players in the field.
   * @returns Number of rounds to play.
   */
  recommendedRounds(playerCount: number): number {
    if (playerCount <= 2) return 1;
    return Math.max(3, Math.ceil(Math.log2(playerCount)));
  }

  /**
   * Computes the Swiss standings from the matches played so far.
   *
   * @param playerIds - Registered players, including those yet to play.
   * @param results - Finished matches of the tournament.
   * @returns Standings sorted from first to last.
   */
  computeStandings(
    playerIds: number[],
    results: SwissMatchResult[],
  ): SwissStanding[] {
    const standings = new Map<number, SwissStanding>();

    for (const playerId of playerIds) {
      standings.set(playerId, {
        playerId,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        byes: 0,
        opponentIds: [],
        opponentMatchWinRate: 0,
        gameWinRate: 0,
        opponentGameWinRate: 0,
      });
    }

    // Game tallies, needed for GW% before averaging on the opponent side.
    const gameWins = new Map<number, number>();
    const gamesPlayed = new Map<number, number>();

    const addGames = (playerId: number, won: number, total: number) => {
      gameWins.set(playerId, (gameWins.get(playerId) ?? 0) + won);
      gamesPlayed.set(playerId, (gamesPlayed.get(playerId) ?? 0) + total);
    };

    for (const result of results) {
      const playerA = standings.get(result.playerAId);

      // A bye is a win in the standings but stays out of every tie-breaker:
      // no opponent recorded, no games counted.
      if (result.isBye || result.playerBId === undefined) {
        if (playerA) {
          playerA.points += WIN_POINTS;
          playerA.wins++;
          playerA.byes++;
        }
        continue;
      }

      const playerB = standings.get(result.playerBId);
      if (!playerA || !playerB) continue;

      playerA.opponentIds.push(playerB.playerId);
      playerB.opponentIds.push(playerA.playerId);

      const scoreA = result.playerAScore ?? 0;
      const scoreB = result.playerBScore ?? 0;
      addGames(playerA.playerId, scoreA, scoreA + scoreB);
      addGames(playerB.playerId, scoreB, scoreA + scoreB);

      if (result.winnerId === undefined) {
        playerA.draws++;
        playerB.draws++;
        playerA.points += DRAW_POINTS;
        playerB.points += DRAW_POINTS;
        continue;
      }

      const winner = result.winnerId === playerA.playerId ? playerA : playerB;
      const loser = winner === playerA ? playerB : playerA;
      winner.wins++;
      winner.points += WIN_POINTS;
      loser.losses++;
      loser.points += LOSS_POINTS;
    }

    // Individual rates, floor included, before averaging over opponents.
    const matchWinRate = new Map<number, number>();
    const gameWinRate = new Map<number, number>();

    for (const standing of standings.values()) {
      const playedMatches = standing.wins + standing.losses + standing.draws;
      const rate =
        playedMatches > 0
          ? (standing.wins * WIN_POINTS + standing.draws * DRAW_POINTS) /
            (playedMatches * WIN_POINTS)
          : 0;
      matchWinRate.set(standing.playerId, Math.max(rate, MIN_OPPONENT_RATE));

      const played = gamesPlayed.get(standing.playerId) ?? 0;
      const won = gameWins.get(standing.playerId) ?? 0;
      const gwr = played > 0 ? won / played : 0;
      gameWinRate.set(standing.playerId, Math.max(gwr, MIN_OPPONENT_RATE));
      standing.gameWinRate = gwr;
    }

    for (const standing of standings.values()) {
      if (standing.opponentIds.length === 0) continue;

      standing.opponentMatchWinRate =
        standing.opponentIds.reduce(
          (sum, opponentId) => sum + (matchWinRate.get(opponentId) ?? 0),
          0,
        ) / standing.opponentIds.length;

      standing.opponentGameWinRate =
        standing.opponentIds.reduce(
          (sum, opponentId) => sum + (gameWinRate.get(opponentId) ?? 0),
          0,
        ) / standing.opponentIds.length;
    }

    return this.sortStandings([...standings.values()]);
  }

  /**
   * Orders Swiss standings by points, then OMW%, GW% and OGW%.
   *
   * The player id acts as the final tie-break to keep the order deterministic.
   *
   * @param standings - Standings in any order.
   * @returns A new sorted array.
   */
  sortStandings(standings: SwissStanding[]): SwissStanding[] {
    return [...standings].sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.opponentMatchWinRate !== b.opponentMatchWinRate) {
        return b.opponentMatchWinRate - a.opponentMatchWinRate;
      }
      if (a.gameWinRate !== b.gameWinRate) return b.gameWinRate - a.gameWinRate;
      if (a.opponentGameWinRate !== b.opponentGameWinRate) {
        return b.opponentGameWinRate - a.opponentGameWinRate;
      }
      return a.playerId - b.playerId;
    });
  }

  /**
   * Pairs the next round from the current standings.
   *
   * Players are grouped by score then paired with their closest neighbour;
   * backtracking avoids rematches, and the bye goes to the lowest ranked
   * player who has not received one yet.
   *
   * @param standings - Current standings, in any order.
   * @param droppedPlayerIds - Players who dropped, excluded from the round.
   * @returns The pairings for the next round.
   */
  pairNextRound(
    standings: SwissStanding[],
    droppedPlayerIds: number[] = [],
  ): SwissPairing[] {
    const dropped = new Set(droppedPlayerIds);
    const active = this.sortStandings(
      standings.filter((standing) => !dropped.has(standing.playerId)),
    );

    if (active.length === 0) return [];

    const pairings: SwissPairing[] = [];
    let pool = active;

    if (pool.length % 2 !== 0) {
      const byeIndex = this.selectByeIndex(pool);
      const byePlayer = pool[byeIndex];
      pool = pool.filter((_, index) => index !== byeIndex);
      pairings.push({ playerAId: byePlayer.playerId, isBye: true });
    }

    const played = new Map<number, Set<number>>(
      active.map((standing) => [
        standing.playerId,
        new Set(standing.opponentIds),
      ]),
    );

    // First pass avoids rematches; when the pool is too constrained (or too
    // large to explore) we fall back to pairing neighbours directly.
    const budget = { remaining: MAX_PAIRING_STEPS };
    const matched =
      this.matchPool(pool, played, true, budget) ??
      this.matchPool(pool, played, false, { remaining: MAX_PAIRING_STEPS });

    return [...pairings, ...(matched ?? [])];
  }

  /**
   * Picks the bye recipient: the lowest ranked player without one yet, or the
   * very last player as a fallback.
   */
  private selectByeIndex(pool: SwissStanding[]): number {
    for (let index = pool.length - 1; index >= 0; index--) {
      if (pool[index].byes === 0) return index;
    }
    return pool.length - 1;
  }

  /**
   * Pairs a sorted pool through backtracking.
   *
   * @param avoidRematch - When false, rematches are tolerated: this is the
   * fallback used when no rematch-free pairing exists.
   * @returns The pairs found, or null when the pool cannot be paired.
   */
  private matchPool(
    pool: SwissStanding[],
    played: Map<number, Set<number>>,
    avoidRematch: boolean,
    budget: { remaining: number },
  ): SwissPairing[] | null {
    if (pool.length === 0) return [];
    if (avoidRematch && budget.remaining-- <= 0) return null;

    const [head, ...rest] = pool;
    const opponents = played.get(head.playerId) ?? new Set<number>();

    for (let index = 0; index < rest.length; index++) {
      const candidate = rest[index];
      if (avoidRematch && opponents.has(candidate.playerId)) continue;

      const remaining = rest.filter((_, position) => position !== index);
      const tail = this.matchPool(remaining, played, avoidRematch, budget);
      if (tail === null) continue;

      return [
        {
          playerAId: head.playerId,
          playerBId: candidate.playerId,
          isBye: false,
        },
        ...tail,
      ];
    }

    return null;
  }
}

/**
 * Converts tournament matches into results the Swiss pairing can consume:
 * only decided encounters are taken into account.
 *
 * @param matches - Matches of the tournament.
 * @returns Results usable by the pairing engine.
 */
export function toSwissResults(matches: Match[] = []): SwissMatchResult[] {
  return matches
    .filter(
      (match) =>
        match.status === MatchStatus.FINISHED ||
        match.status === MatchStatus.FORFEIT,
    )
    .filter((match) => Boolean(match.playerA))
    .map((match) => ({
      playerAId: match.playerA.id,
      playerBId: match.playerB?.id,
      winnerId: match.winner?.id,
      playerAScore: match.playerAScore,
      playerBScore: match.playerBScore,
      isBye: match.isBye || !match.playerB,
    }));
}
