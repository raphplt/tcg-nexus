import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Match, MatchStatus } from "../match/entities/match.entity";
import { Player } from "../player/entities/player.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../tournament/entities/tournament.entity";
import {
  SwissPairingService,
  toSwissResults,
} from "../tournament/services/swiss-pairing.service";
import { User } from "../user/entities/user.entity";
import { CreateRankingDto } from "./dto/create-ranking.dto";
import { UpdateRankingDto } from "./dto/update-ranking.dto";
import { RankedMatchHistory } from "./entities/ranked-match-history.entity";
import { Ranking } from "./entities/ranking.entity";

export interface GlobalRankingPlayer {
  rank: number;
  userId: number;
  pseudo: string;
  avatarUrl: string | null;
  score: number;
  tendency: "up" | "down" | "equal";
}

export interface RankingCalculationResult {
  playerId: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  tieBreaks: {
    opponentWinRate: number;
    gameWinRate: number;
  };
}

interface RankingRow {
  rank: string | number | null;
  oldRank: string | number | null;
  userId: string | number | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  score: string | number;
  total: string | number;
}

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(RankedMatchHistory)
    private rankedHistoryRepository: Repository<RankedMatchHistory>,
    private swissPairingService: SwissPairingService,
  ) {}

  /**
   * Computes the beginning of the comparison window.
   *
   * All-time rankings retain the existing 30-day trend window.
   */
  private getPeriodStartDate(period: string): Date {
    const date = new Date();
    if (period === "week") {
      date.setDate(date.getDate() - 7);
    } else if (period === "month") {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setDate(date.getDate() - 30);
    }
    return date;
  }

  private buildRankingSql(format?: string): string {
    const formatJoins = format
      ? `
        LEFT JOIN "casual_match_session" cs ON cs.id = h."casualSessionId"
        LEFT JOIN deck deck_a ON deck_a.id = cs."playerADeckId"
        LEFT JOIN deck_format format_a ON format_a.id = deck_a."formatId"
        LEFT JOIN deck deck_b ON deck_b.id = cs."playerBDeckId"
        LEFT JOIN deck_format format_b ON format_b.id = deck_b."formatId"
        LEFT JOIN "match" m ON m.id = h."matchId"
        LEFT JOIN tournament t ON t.id = m."tournamentId"`
      : "";
    const formatPredicate = format
      ? `AND (
          (h."casualSessionId" IS NOT NULL AND (format_a.type = $2 OR format_b.type = $2))
          OR (h."matchId" IS NOT NULL AND $2 = ANY(string_to_array(t."allowedFormats", ',')))
        )`
      : "";
    const activePlayerPredicate = format
      ? `WHERE aggregated_deltas.user_id IS NOT NULL`
      : "";

    return `
      WITH filtered_history AS (
        SELECT h."winnerId", h."loserId", h.delta
        FROM ranked_match_history h
        ${formatJoins}
        WHERE h."createdAt" >= $1
        ${formatPredicate}
      ), history_deltas AS (
        SELECT "winnerId" AS user_id, delta AS delta
        FROM filtered_history
        WHERE "winnerId" IS NOT NULL
        UNION ALL
        SELECT "loserId" AS user_id, -delta AS delta
        FROM filtered_history
        WHERE "loserId" IS NOT NULL
      ), aggregated_deltas AS (
        SELECT user_id, SUM(delta) AS delta
        FROM history_deltas
        GROUP BY user_id
      ), eligible_players AS (
        SELECT
          player.id AS player_id,
          player.elo AS score,
          app_user.id AS user_id,
          app_user."firstName" AS first_name,
          app_user."lastName" AS last_name,
          app_user.email AS email,
          app_user."avatarUrl" AS avatar_url,
          COALESCE(aggregated_deltas.delta, 0) AS period_delta
        FROM player
        INNER JOIN "user" app_user ON app_user.id = player."userId"
        LEFT JOIN aggregated_deltas ON aggregated_deltas.user_id = app_user.id
        ${activePlayerPredicate}
      ), ranked_players AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY score DESC, player_id ASC) AS rank,
          ROW_NUMBER() OVER (
            ORDER BY (score - period_delta) DESC, player_id ASC
          ) AS old_rank,
          COUNT(*) OVER () AS total
        FROM eligible_players
      )`;
  }

  private toGlobalRankingPlayer(row: RankingRow): GlobalRankingPlayer {
    const rank = Number(row.rank);
    const oldRank = Number(row.oldRank);
    return {
      rank,
      userId: Number(row.userId),
      pseudo: row.firstName
        ? `${row.firstName} ${row.lastName ?? ""}`.trim()
        : row.email,
      avatarUrl: row.avatarUrl || null,
      score: Number(row.score),
      tendency: this.computeTendency(rank, oldRank),
    };
  }

  private computeTendency(
    currentRank: number | undefined,
    oldRank: number | undefined,
  ): "up" | "down" | "equal" {
    if (currentRank == null || oldRank == null) return "equal";
    if (oldRank > currentRank) return "up";
    if (oldRank < currentRank) return "down";
    return "equal";
  }

  /**
   * Retrieves the paginated global ranking and its period trend.
   */
  async getGlobalRanking(
    page: number = 1,
    limit: number = 20,
    period: string = "all-time",
    format?: string,
  ): Promise<{
    data: GlobalRankingPlayer[];
    total: number;
    page: number;
    limit: number;
  }> {
    const parameters: Array<Date | string | number> = [
      this.getPeriodStartDate(period),
    ];
    if (format) parameters.push(format);
    parameters.push(limit, (page - 1) * limit);
    const limitParameter = format ? 3 : 2;
    const offsetParameter = format ? 4 : 3;
    const rows = await this.rankedHistoryRepository.query<RankingRow[]>(
      `${this.buildRankingSql(format)}
       SELECT
         ranked_page.rank,
         ranked_page.old_rank AS "oldRank",
         ranked_page.user_id AS "userId",
         ranked_page.first_name AS "firstName",
         ranked_page.last_name AS "lastName",
         ranked_page.email,
         ranked_page.avatar_url AS "avatarUrl",
         ranked_page.score,
         ranked_total.total
       FROM (SELECT COUNT(*) AS total FROM ranked_players) ranked_total
       LEFT JOIN LATERAL (
         SELECT *
         FROM ranked_players
         ORDER BY rank
         LIMIT $${limitParameter} OFFSET $${offsetParameter}
       ) ranked_page ON TRUE`,
      parameters,
    );

    const data = rows
      .filter((row) => row.rank != null)
      .map((row) => this.toGlobalRankingPlayer(row));
    const total = Number(rows[0]?.total ?? 0);

    return { data, total, page, limit };
  }

  /**
   * Retrieves a user's position without materializing the complete ranking.
   */
  async getMyRankingPosition(
    userId: number,
    period: string = "all-time",
    format?: string,
  ): Promise<GlobalRankingPlayer> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!player) {
      throw new NotFoundException({
        code: "PLAYER_NOT_FOUND",
        message: "Joueur non trouvé",
      });
    }

    const parameters: Array<Date | string | number> = [
      this.getPeriodStartDate(period),
    ];
    if (format) parameters.push(format);
    parameters.push(userId);
    const userParameter = format ? 3 : 2;
    const rows = await this.rankedHistoryRepository.query<RankingRow[]>(
      `${this.buildRankingSql(format)}
       SELECT
         rank,
         old_rank AS "oldRank",
         user_id AS "userId",
         first_name AS "firstName",
         last_name AS "lastName",
         email,
         avatar_url AS "avatarUrl",
         score,
         total
       FROM ranked_players
       WHERE user_id = $${userParameter}`,
      parameters,
    );

    if (rows.length > 0) return this.toGlobalRankingPlayer(rows[0]);

    return {
      rank: 0,
      userId: player.user.id,
      pseudo: player.user.firstName
        ? `${player.user.firstName} ${player.user.lastName}`.trim()
        : player.user.email,
      avatarUrl: player.user.avatarUrl || null,
      score: player.elo,
      tendency: "equal",
    };
  }

  /**
   * Crée un nouveau ranking
   */
  async create(createRankingDto: CreateRankingDto): Promise<Ranking> {
    const { tournamentId, playerId, ...rankingData } = createRankingDto;

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const player = await this.playerRepository.findOne({
      where: { id: playerId },
    });
    if (!player) {
      throw new NotFoundException({
        code: "PLAYER_NOT_FOUND",
        message: "Joueur non trouvé",
      });
    }

    const ranking = this.rankingRepository.create({
      tournament,
      player,
      ...rankingData,
    });

    return this.rankingRepository.save(ranking);
  }

  /**
   * Récupère tous les rankings avec filtres
   */
  async findAll(tournamentId?: number): Promise<Ranking[]> {
    const queryBuilder = this.rankingRepository
      .createQueryBuilder("ranking")
      .leftJoinAndSelect("ranking.tournament", "tournament")
      .leftJoinAndSelect("ranking.player", "player")
      .orderBy("ranking.rank", "ASC");

    if (tournamentId) {
      queryBuilder.where("tournament.id = :tournamentId", { tournamentId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Récupère un ranking par ID
   */
  async findOne(id: number): Promise<Ranking> {
    const ranking = await this.rankingRepository.findOne({
      where: { id },
      relations: ["tournament", "player"],
    });

    if (!ranking) {
      throw new NotFoundException(`Ranking avec l'ID ${id} non trouvé`);
    }

    return ranking;
  }

  /**
   * Met à jour un ranking
   */
  async update(
    id: number,
    updateRankingDto: UpdateRankingDto,
  ): Promise<Ranking> {
    const ranking = await this.findOne(id);
    Object.assign(ranking, updateRankingDto);
    return this.rankingRepository.save(ranking);
  }

  /**
   * Supprime un ranking
   */
  async remove(id: number): Promise<void> {
    const ranking = await this.findOne(id);
    await this.rankingRepository.remove(ranking);
  }

  /**
   * Récupère le classement d'un tournoi
   */
  async getTournamentRankings(tournamentId: number): Promise<Ranking[]> {
    return this.rankingRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: ["player", "player.user"],
      order: {
        points: "DESC",
        winRate: "DESC",
        wins: "DESC",
      },
    });
  }

  /**
   * Met à jour tous les classements d'un tournoi
   */
  async updateTournamentRankings(tournamentId: number): Promise<Ranking[]> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        "matches",
        "matches.playerA",
        "matches.playerB",
        "matches.winner",
      ],
    });

    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const playerStats = this.calculatePlayerStatistics(tournament);
    const playerIds = Array.from(playerStats.keys());
    const existingRankings = playerIds.length
      ? await this.rankingRepository.find({
          where: {
            tournament: { id: tournamentId },
            player: { id: In(playerIds) },
          },
          relations: ["player"],
        })
      : [];
    const rankingByPlayerId = new Map(
      existingRankings.map((ranking) => [ranking.player.id, ranking]),
    );
    const rankings: Ranking[] = [];

    for (const [playerId, stats] of playerStats.entries()) {
      let ranking = rankingByPlayerId.get(playerId);

      if (!ranking) {
        ranking = this.rankingRepository.create({
          tournament: { id: tournamentId } as Tournament,
          player: { id: playerId } as Player,
          rank: 0,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
        });
      }

      ranking.points = stats.points;
      ranking.wins = stats.wins;
      ranking.losses = stats.losses;
      ranking.draws = stats.draws;
      ranking.winRate = stats.winRate;

      rankings.push(ranking);
    }

    if (tournament.type === TournamentType.SWISS_SYSTEM) {
      // Swiss standings are broken by the official tie-breakers (OMW%, GW%,
      // OGW%) rather than by a plain win ratio.
      const swissStandings = this.swissPairingService.computeStandings(
        playerIds,
        toSwissResults(tournament.matches),
      );
      const swissOrder = new Map(
        swissStandings.map((standing, index) => [standing.playerId, index]),
      );

      rankings.sort(
        (a, b) =>
          (swissOrder.get(a.player.id) ?? Number.MAX_SAFE_INTEGER) -
          (swissOrder.get(b.player.id) ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      rankings.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.winRate !== b.winRate) return b.winRate - a.winRate;
        return b.wins - a.wins;
      });
    }

    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    await this.rankingRepository.save(rankings);

    if (
      tournament.status === TournamentStatus.FINISHED ||
      tournament.isFinished
    ) {
      await this.processTournamentMatchesForElo(tournamentId);
    }

    return rankings;
  }

  /**
   * Calcule et met à jour le score ELO après chaque tournoi terminé
   */
  async processTournamentMatchesForElo(tournamentId: number): Promise<void> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        "matches",
        "matches.playerA",
        "matches.playerA.user",
        "matches.playerB",
        "matches.playerB.user",
        "matches.winner",
        "matches.winner.user",
      ],
    });

    if (!tournament) return;

    const sortedMatches = tournament.matches
      .filter((m) => m.status === MatchStatus.FINISHED)
      .sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.id - b.id;
      });

    const matchIds = sortedMatches.map((match) => match.id);
    const existingHistory = matchIds.length
      ? await this.rankedHistoryRepository.find({
          where: { matchId: In(matchIds) },
          select: { matchId: true },
        })
      : [];
    const processedMatchIds = new Set(
      existingHistory.map((history) => history.matchId),
    );

    for (const match of sortedMatches) {
      if (
        !processedMatchIds.has(match.id) &&
        match.playerA?.user &&
        match.playerB?.user
      ) {
        let winnerUserId: number | undefined;
        let loserUserId: number | undefined;
        let isDraw = false;

        if (match.winner?.user) {
          winnerUserId = match.winner.user.id;
          loserUserId =
            match.playerA.user.id === match.winner.user.id
              ? match.playerB.user.id
              : match.playerA.user.id;
        } else {
          isDraw = true;
          // For draw, order doesn't really matter for ELO formula
          winnerUserId = match.playerA.user.id;
          loserUserId = match.playerB.user.id;
        }

        if (winnerUserId && loserUserId) {
          try {
            await this.updateEloWithHistory(
              winnerUserId,
              loserUserId,
              { matchId: match.id },
              isDraw,
            );
            processedMatchIds.add(match.id);
          } catch (error) {
            console.error(
              `Failed to update ELO for tournament match ${match.id}`,
              error,
            );
          }
        }
      }
    }
  }

  /**
   * Calculates base standings (points, wins, losses, draws, win rate) from finished matches.
   */
  private calculatePlayerStatistics(
    tournament: Tournament,
  ): Map<number, RankingCalculationResult> {
    const playerStats = new Map<number, RankingCalculationResult>();
    const pointsSystem = this.getPointsSystem(tournament.type);

    // Initialize stats for all participating players who played matches
    const allPlayerIds = new Set<number>();
    tournament.matches.forEach((match) => {
      if (match.playerA) allPlayerIds.add(match.playerA.id);
      if (match.playerB) allPlayerIds.add(match.playerB.id);
    });

    allPlayerIds.forEach((playerId) => {
      playerStats.set(playerId, {
        playerId,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        tieBreaks: {
          opponentWinRate: 0,
          gameWinRate: 0,
        },
      });
    });

    // Calculate match outcomes
    tournament.matches
      .filter((match) => match.finishedAt) // Process finished matches only
      .forEach((match) => {
        // A bye counts as a win: the player clears the round unopposed.
        if (match.isBye && match.playerA) {
          const byeStats = playerStats.get(match.playerA.id);
          if (byeStats) {
            byeStats.wins++;
            byeStats.points += pointsSystem.win;
          }
          return;
        }

        if (!match.playerA || !match.playerB) return;

        const playerAStats = playerStats.get(match.playerA.id)!;
        const playerBStats = playerStats.get(match.playerB.id)!;

        if (match.winner) {
          // Decided match outcome with a winner
          if (match.winner.id === match.playerA.id) {
            playerAStats.wins++;
            playerAStats.points += pointsSystem.win;
            playerBStats.losses++;
            playerBStats.points += pointsSystem.loss;
          } else {
            playerBStats.wins++;
            playerBStats.points += pointsSystem.win;
            playerAStats.losses++;
            playerAStats.points += pointsSystem.loss;
          }
        } else {
          // Match nul
          playerAStats.draws++;
          playerAStats.points += pointsSystem.draw;
          playerBStats.draws++;
          playerBStats.points += pointsSystem.draw;
        }
      });

    // Calculer les winRates
    playerStats.forEach((stats) => {
      const totalGames = stats.wins + stats.losses + stats.draws;
      stats.winRate = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;
    });

    return playerStats;
  }

  /**
   * Récupère le système de points selon le type de tournoi
   */
  private getPointsSystem(tournamentType: TournamentType): {
    win: number;
    draw: number;
    loss: number;
  } {
    switch (tournamentType) {
      case TournamentType.SWISS_SYSTEM:
        return { win: 3, draw: 1, loss: 0 };

      case TournamentType.ROUND_ROBIN:
        return { win: 3, draw: 1, loss: 0 };

      case TournamentType.SINGLE_ELIMINATION:
      case TournamentType.DOUBLE_ELIMINATION:
        return { win: 1, draw: 0, loss: 0 };

      default:
        return { win: 3, draw: 1, loss: 0 };
    }
  }

  /**
   * Récupère le classement d'un joueur dans un tournoi
   */
  async getPlayerRanking(
    tournamentId: number,
    playerId: number,
  ): Promise<Ranking | null> {
    return this.rankingRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } },
      relations: ["tournament", "player"],
    });
  }

  /**
   * Récupère les classements finaux d'un tournoi terminé
   */
  async getFinalRankings(tournamentId: number): Promise<Ranking[]> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    return this.getTournamentRankings(tournamentId);
  }

  /**
   * Calcule les tie-breakers pour départager les égalités
   */
  async calculateTieBreakers(
    tournamentId: number,
    playerIds: number[],
  ): Promise<Map<number, { opponentWinRate: number; gameWinRate: number }>> {
    const matches = await this.matchRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: ["playerA", "playerB", "winner"],
    });

    const finishedMatches = matches.filter((match) => match.finishedAt);
    const matchesByPlayer = new Map<number, Match[]>();
    const winsByPlayer = new Map<number, number>();

    for (const match of finishedMatches) {
      for (const player of [match.playerA, match.playerB]) {
        if (!player) continue;
        const playerMatches = matchesByPlayer.get(player.id) ?? [];
        playerMatches.push(match);
        matchesByPlayer.set(player.id, playerMatches);
      }
      if (match.winner) {
        winsByPlayer.set(
          match.winner.id,
          (winsByPlayer.get(match.winner.id) ?? 0) + 1,
        );
      }
    }

    const tieBreakers = new Map<
      number,
      { opponentWinRate: number; gameWinRate: number }
    >();

    for (const playerId of playerIds) {
      const playerMatches = matchesByPlayer.get(playerId) ?? [];

      let opponentWinRateSum = 0;
      let gameWins = 0;
      let totalGames = 0;
      let opponentCount = 0;

      for (const match of playerMatches) {
        const opponent =
          match.playerA?.id === playerId ? match.playerB : match.playerA;
        if (!opponent) continue;

        const opponentWins = winsByPlayer.get(opponent.id) ?? 0;
        const opponentTotal = matchesByPlayer.get(opponent.id)?.length ?? 0;
        const opponentWinRate =
          opponentTotal > 0 ? opponentWins / opponentTotal : 0;

        opponentWinRateSum += opponentWinRate;
        opponentCount++;

        const isPlayerA = match.playerA?.id === playerId;
        const playerScore = isPlayerA ? match.playerAScore : match.playerBScore;
        const opponentScore = isPlayerA
          ? match.playerBScore
          : match.playerAScore;

        gameWins += playerScore;
        totalGames += playerScore + opponentScore;
      }

      tieBreakers.set(playerId, {
        opponentWinRate:
          opponentCount > 0 ? opponentWinRateSum / opponentCount : 0,
        gameWinRate: totalGames > 0 ? gameWins / totalGames : 0,
      });
    }

    return tieBreakers;
  }

  // ── ELO Calculation for Ranked Matches ────────────────────

  private static readonly ELO_K = 32;

  /**
   * Updates ELO for both players after a ranked match.
   * @param winnerUserId  User ID of the winner
   * @param loserUserId   User ID of the loser
   * @param isDraw        If true, both players get 0.5 instead of 1/0
   */
  async updateElo(
    winnerUserId: number,
    loserUserId: number,
    isDraw: boolean = false,
  ): Promise<{ winnerElo: number; loserElo: number }> {
    const [winnerPlayer, loserPlayer] = await Promise.all([
      this.playerRepository.findOne({
        where: { user: { id: winnerUserId } },
      }),
      this.playerRepository.findOne({
        where: { user: { id: loserUserId } },
      }),
    ]);

    if (!winnerPlayer || !loserPlayer) {
      throw new NotFoundException("Player profile not found for ELO update");
    }

    const winnerElo = winnerPlayer.elo ?? 1000;
    const loserElo = loserPlayer.elo ?? 1000;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    const K = RankingService.ELO_K;

    if (isDraw) {
      winnerPlayer.elo = Math.round(winnerElo + K * (0.5 - expectedWinner));
      loserPlayer.elo = Math.round(loserElo + K * (0.5 - expectedLoser));
    } else {
      winnerPlayer.elo = Math.round(winnerElo + K * (1 - expectedWinner));
      loserPlayer.elo = Math.round(loserElo + K * (0 - expectedLoser));
    }

    await Promise.all([
      this.playerRepository.save(winnerPlayer),
      this.playerRepository.save(loserPlayer),
    ]);

    return {
      winnerElo: winnerPlayer.elo,
      loserElo: loserPlayer.elo,
    };
  }

  /**
   * Same as updateElo but also persists a RankedMatchHistory row for audits and
   * progression graphs. Source identifies whether the match came from the
   * casual/ranked queue or a tournament bracket.
   */
  async updateEloWithHistory(
    winnerUserId: number,
    loserUserId: number,
    source: { casualSessionId?: number; matchId?: number },
    isDraw: boolean = false,
  ): Promise<{ winnerElo: number; loserElo: number; delta: number }> {
    const [winnerPlayer, loserPlayer] = await Promise.all([
      this.playerRepository.findOne({
        where: { user: { id: winnerUserId } },
      }),
      this.playerRepository.findOne({
        where: { user: { id: loserUserId } },
      }),
    ]);

    if (!winnerPlayer || !loserPlayer) {
      throw new NotFoundException("Player profile not found for ELO update");
    }

    const winnerEloBefore = winnerPlayer.elo ?? 1000;
    const loserEloBefore = loserPlayer.elo ?? 1000;

    const result = await this.updateElo(winnerUserId, loserUserId, isDraw);

    const delta = result.winnerElo - winnerEloBefore;

    const history = this.rankedHistoryRepository.create({
      casualSessionId: source.casualSessionId ?? null,
      matchId: source.matchId ?? null,
      winner: { id: winnerUserId } as User,
      loser: { id: loserUserId } as User,
      winnerEloBefore,
      winnerEloAfter: result.winnerElo,
      loserEloBefore,
      loserEloAfter: result.loserElo,
      delta,
      isDraw,
    });
    await this.rankedHistoryRepository.save(history);

    return { ...result, delta };
  }

  async getEloForUser(userId: number): Promise<number> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });
    return player?.elo ?? 1000;
  }

  async getRecentEloHistory(
    userId: number,
    limit: number = 20,
  ): Promise<RankedMatchHistory[]> {
    return this.rankedHistoryRepository
      .createQueryBuilder("history")
      .leftJoinAndSelect("history.winner", "winner")
      .leftJoinAndSelect("history.loser", "loser")
      .where("winner.id = :userId OR loser.id = :userId", { userId })
      .orderBy("history.createdAt", "DESC")
      .limit(limit)
      .getMany();
  }
}
