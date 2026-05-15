import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { CasualMatchSession } from "../match/entities/casual-match-session.entity";
import { Match, MatchStatus } from "../match/entities/match.entity";
import { Player } from "../player/entities/player.entity";
import {
  Tournament,
  TournamentType,
} from "../tournament/entities/tournament.entity";
import { User } from "../user/entities/user.entity";
import { CreateRankingDto } from "./dto/create-ranking.dto";
import { UpdateRankingDto } from "./dto/update-ranking.dto";
import { RankedMatchHistory } from "./entities/ranked-match-history.entity";
import { Ranking } from "./entities/ranking.entity";
import { TournamentStatus } from "../tournament/entities/tournament.entity";

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
    opponentWinRate: number; // Moyenne des winRate des adversaires
    gameWinRate: number; // Ratio de games gagnés
  };
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
  ) {}

  /**
   * Date de début de la période pour la tendance (week/month/all-time).
   * "all-time" utilise une fenêtre de 30 jours comme proxy de "période précédente".
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

  /**
   * Récupère les lignes de RankedMatchHistory dans la période, optionnellement filtrées par format de deck.
   * Un row "matche" le format si :
   *   - row.casualSessionId set ET au moins un des decks (A ou B) de la session est dans ce format
   *   - row.matchId set ET le tournoi du match a `format` dans ses allowedFormats
   */
  private async getInPeriodHistory(
    periodStart: Date,
    format?: string,
  ): Promise<
    Array<{ winnerId: number | null; loserId: number | null; delta: number }>
  > {
    const qb = this.rankedHistoryRepository
      .createQueryBuilder("h")
      .select("h.winnerId", "winnerId")
      .addSelect("h.loserId", "loserId")
      .addSelect("h.delta", "delta")
      .where("h.createdAt >= :date", { date: periodStart });

    if (format) {
      qb.leftJoin(CasualMatchSession, "cs", "cs.id = h.casualSessionId")
        .leftJoin("deck", "deckA", `deckA.id = cs."playerADeckId"`)
        .leftJoin("deck", "deckB", `deckB.id = cs."playerBDeckId"`)
        .leftJoin("deck_format", "fA", `fA.id = deckA."formatId"`)
        .leftJoin("deck_format", "fB", `fB.id = deckB."formatId"`)
        .leftJoin(Match, "m", "m.id = h.matchId")
        .leftJoin(Tournament, "t", `t.id = m."tournamentId"`)
        .andWhere(
          `(
            (h.casualSessionId IS NOT NULL AND (fA.type = :format OR fB.type = :format))
            OR (h.matchId IS NOT NULL AND :format = ANY(string_to_array(t."allowedFormats", ',')))
          )`,
          { format },
        );
    }

    const rows = await qb.getRawMany<{
      winnerId: number | null;
      loserId: number | null;
      delta: number | string;
    }>();

    return rows.map((r) => ({
      winnerId: r.winnerId ?? null,
      loserId: r.loserId ?? null,
      delta: Number(r.delta) || 0,
    }));
  }

  /**
   * Construit un snapshot de classement avec rang actuel et rang au début de période.
   * Si `format` est fourni, ne retient que les joueurs ayant joué ≥1 match dans ce format pendant la période.
   */
  private async buildRankingSnapshot(
    period: string,
    format?: string,
  ): Promise<{
    players: Player[];
    currentRank: Map<number, number>;
    oldRank: Map<number, number>;
  }> {
    const periodStart = this.getPeriodStartDate(period);
    const history = await this.getInPeriodHistory(periodStart, format);

    const deltaByUser = new Map<number, number>();
    const activeUsers = new Set<number>();
    for (const row of history) {
      if (row.winnerId != null) {
        deltaByUser.set(
          row.winnerId,
          (deltaByUser.get(row.winnerId) ?? 0) + row.delta,
        );
        activeUsers.add(row.winnerId);
      }
      if (row.loserId != null) {
        deltaByUser.set(
          row.loserId,
          (deltaByUser.get(row.loserId) ?? 0) - row.delta,
        );
        activeUsers.add(row.loserId);
      }
    }

    const playerWhere = format
      ? { user: { id: In(Array.from(activeUsers)) } }
      : {};
    const players = format && activeUsers.size === 0
      ? []
      : await this.playerRepository.find({
          where: playerWhere,
          relations: ["user"],
        });

    const byCurrent = [...players].sort(
      (a, b) => b.elo - a.elo || a.id - b.id,
    );
    const currentRank = new Map<number, number>();
    byCurrent.forEach((p, i) => currentRank.set(p.id, i + 1));

    const byOld = [...players].sort((a, b) => {
      const va = a.elo - (deltaByUser.get(a.user.id) ?? 0);
      const vb = b.elo - (deltaByUser.get(b.user.id) ?? 0);
      return vb - va || a.id - b.id;
    });
    const oldRank = new Map<number, number>();
    byOld.forEach((p, i) => oldRank.set(p.id, i + 1));

    return { players: byCurrent, currentRank, oldRank };
  }

  private toGlobalRankingPlayer(
    player: Player,
    rank: number,
    tendency: "up" | "down" | "equal",
  ): GlobalRankingPlayer {
    return {
      rank,
      userId: player.user.id,
      pseudo: player.user.firstName
        ? `${player.user.firstName} ${player.user.lastName}`.trim()
        : player.user.email,
      avatarUrl: player.user.avatarUrl || null,
      score: player.elo,
      tendency,
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
   * Récupère le classement global avec pagination et filtres (période, format de deck).
   * Tendance = rang actuel comparé au rang au début de la période.
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
    const { players, currentRank, oldRank } = await this.buildRankingSnapshot(
      period,
      format,
    );

    const total = players.length;
    const pageSlice = players.slice((page - 1) * limit, page * limit);

    const data = pageSlice.map((p) =>
      this.toGlobalRankingPlayer(
        p,
        currentRank.get(p.id)!,
        this.computeTendency(currentRank.get(p.id), oldRank.get(p.id)),
      ),
    );

    return { data, total, page, limit };
  }

  /**
   * Récupère la position de l'utilisateur dans le classement global.
   * Le rang est calculé sur le sous-ensemble actif si `format` est fourni.
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
      throw new NotFoundException("Joueur non trouvé");
    }

    const { currentRank, oldRank } = await this.buildRankingSnapshot(
      period,
      format,
    );

    const rank = currentRank.get(player.id);
    if (rank == null) {
      // Le joueur n'a pas participé au format demandé sur la période
      return this.toGlobalRankingPlayer(player, 0, "equal");
    }

    return this.toGlobalRankingPlayer(
      player,
      rank,
      this.computeTendency(currentRank.get(player.id), oldRank.get(player.id)),
    );
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
      throw new NotFoundException("Tournoi non trouvé");
    }

    const player = await this.playerRepository.findOne({
      where: { id: playerId },
    });
    if (!player) {
      throw new NotFoundException("Joueur non trouvé");
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
      relations: ["player"],
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
      throw new NotFoundException("Tournoi non trouvé");
    }

    const playerStats = this.calculatePlayerStatistics(tournament);

    const rankings: Ranking[] = [];

    for (const [playerId, stats] of playerStats.entries()) {
      let ranking = await this.rankingRepository.findOne({
        where: { tournament: { id: tournamentId }, player: { id: playerId } },
      });

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

      // Mettre à jour les statistiques
      ranking.points = stats.points;
      ranking.wins = stats.wins;
      ranking.losses = stats.losses;
      ranking.draws = stats.draws;
      ranking.winRate = stats.winRate;

      rankings.push(ranking);
    }

    // Trier et assigner les rangs
    rankings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.winRate !== b.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    });

    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    // Sauvegarder
    await this.rankingRepository.save(rankings);

    // Mettre à jour l'ELO si le tournoi est terminé
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

    for (const match of sortedMatches) {
      const existingHistory = await this.rankedHistoryRepository.findOne({
        where: { matchId: match.id },
      });

      if (!existingHistory && match.playerA?.user && match.playerB?.user) {
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
   * Calcule les statistiques des joueurs d'un tournoi
   */
  private calculatePlayerStatistics(
    tournament: Tournament,
  ): Map<number, RankingCalculationResult> {
    const playerStats = new Map<number, RankingCalculationResult>();
    const pointsSystem = this.getPointsSystem(tournament.type);

    // Initialiser les stats pour tous les joueurs ayant des matches
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

    // Calculer les résultats des matches
    tournament.matches
      .filter((match) => match.finishedAt) // Seulement les matches terminés
      .forEach((match) => {
        if (!match.playerA || !match.playerB) return;

        const playerAStats = playerStats.get(match.playerA.id)!;
        const playerBStats = playerStats.get(match.playerB.id)!;

        if (match.winner) {
          // Match avec vainqueur
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
      throw new NotFoundException("Tournoi non trouvé");
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

    const tieBreakers = new Map();

    for (const playerId of playerIds) {
      const playerMatches = matches.filter(
        (match) =>
          match.playerA?.id === playerId || match.playerB?.id === playerId,
      );

      let opponentWinRateSum = 0;
      let gameWins = 0;
      let totalGames = 0;
      let opponentCount = 0;

      for (const match of playerMatches) {
        if (!match.finishedAt) continue;

        const opponent =
          match.playerA?.id === playerId ? match.playerB : match.playerA;
        if (!opponent) continue;

        // Calculer le winRate de l'adversaire
        const opponentMatches = matches.filter(
          (m) =>
            m.finishedAt &&
            (m.playerA?.id === opponent.id || m.playerB?.id === opponent.id),
        );

        const opponentWins = opponentMatches.filter(
          (m) => m.winner?.id === opponent.id,
        ).length;
        const opponentTotal = opponentMatches.length;
        const opponentWinRate =
          opponentTotal > 0 ? opponentWins / opponentTotal : 0;

        opponentWinRateSum += opponentWinRate;
        opponentCount++;

        // Games win rate (basé sur les scores)
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
