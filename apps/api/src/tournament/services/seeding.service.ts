import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Player } from "../../player/entities/player.entity";
import { Ranking } from "../../ranking/entities/ranking.entity";
import { Tournament } from "../entities/tournament.entity";

export enum SeedingMethod {
  RANDOM = "random",
  RANKING = "ranking",
  ELO = "elo",
  MANUAL = "manual",
}

export interface SeededPlayer extends Player {
  seed: number;
  ranking?: number;
  score?: number;
}

interface PlayerRankingStats {
  ranking_playerId: string;
  avgPoints: string;
  avgWinRate: string;
  tournamentCount: string;
}

interface PlayerDetailedStats {
  avgPoints: string;
  avgWinRate: string;
  tournamentCount: string;
  bestRank: string;
}

@Injectable()
export class SeedingService {
  constructor(
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>,
  ) {}

  /**
   * Génère le seeding des joueurs selon la méthode choisie
   */
  async seedPlayers(
    players: Player[],
    tournament: Tournament,
    method: SeedingMethod = SeedingMethod.RANDOM,
  ): Promise<SeededPlayer[]> {
    switch (method) {
      case SeedingMethod.RANDOM:
        return this.randomSeeding(players);

      case SeedingMethod.RANKING:
        return this.rankingBasedSeeding(players);

      case SeedingMethod.ELO:
        return this.eloBasedSeeding(players);

      case SeedingMethod.MANUAL:
        // Returns input order for manual seeding mode
        return this.manualSeeding(players);

      default:
        return this.randomSeeding(players);
    }
  }

  /**
   * Random seeding using Fisher-Yates shuffle algorithm.
   */
  private randomSeeding(players: Player[]): SeededPlayer[] {
    const shuffled = [...players];

    // Fisher-Yates algorithm for fair shuffling
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.map((player, index) => ({
      ...player,
      seed: index + 1,
    }));
  }

  /**
   * Seeding based on global player ranking statistics.
   */
  private async rankingBasedSeeding(
    players: Player[],
  ): Promise<SeededPlayer[]> {
    // Fetch global player ranking statistics
    const playerRankings = await this.rankingRepository
      .createQueryBuilder("ranking")
      .select([
        "ranking.playerId as ranking_playerId",
        "AVG(ranking.points) as avgPoints",
        "AVG(ranking.winRate) as avgWinRate",
        "COUNT(ranking.id) as tournamentCount",
      ])
      .where("ranking.playerId IN (:...playerIds)", {
        playerIds: players.map((p) => p.id),
      })
      .groupBy("ranking.playerId")
      .getRawMany<PlayerRankingStats>();

    // Build lookup map for fast access
    const rankingMap = new Map<
      number,
      { avgPoints: number; avgWinRate: number; tournamentCount: number }
    >();
    playerRankings.forEach((r: PlayerRankingStats) => {
      rankingMap.set(parseInt(r.ranking_playerId), {
        avgPoints: parseFloat(r.avgPoints) || 0,
        avgWinRate: parseFloat(r.avgWinRate) || 0,
        tournamentCount: parseInt(r.tournamentCount) || 0,
      });
    });

    // Compute composite score for each player
    const playersWithScores = players.map((player) => {
      const ranking = rankingMap.get(player.id);
      let score = 0;

      if (ranking) {
        // Score based on average points (70%) and win rate (30%)
        score = ranking.avgPoints * 0.7 + ranking.avgWinRate * 0.3;

        // Experience bonus based on tournament count
        score += Math.min(ranking.tournamentCount * 0.5, 5);
      }

      return {
        ...player,
        score,
        ranking: ranking?.avgPoints || 0,
        seed: 0, // Assigned below
      } as SeededPlayer;
    });

    // Sort by descending score
    playersWithScores.sort((a, b) => (b.score || 0) - (a.score || 0));

    return playersWithScores.map((player, index) => ({
      ...player,
      seed: index + 1,
    }));
  }

  /**
   * Seeding basé sur l'ELO (si implémenté)
   */
  private async eloBasedSeeding(players: Player[]): Promise<SeededPlayer[]> {
    // Fetch fresh player data with elo scores
    const playerIds = players.map((p) => p.id);
    const freshPlayers = await this.playerRepository.findByIds(playerIds);

    const eloMap = new Map<number, number>();
    freshPlayers.forEach((p) => eloMap.set(p.id, p.elo ?? 1000));

    const playersWithElo = players.map((player) => ({
      ...player,
      elo: eloMap.get(player.id) ?? 1000,
      seed: 0,
    }));

    // Sort by ELO descending
    playersWithElo.sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));

    return playersWithElo.map((player, index) => ({
      ...player,
      seed: index + 1,
    }));
  }

  /**
   * Seeding manuel (ordre donné)
   */
  private manualSeeding(players: Player[]): SeededPlayer[] {
    return players.map((player, index) => ({
      ...player,
      seed: index + 1,
    }));
  }

  /**
   * Génère un seeding équilibré pour les brackets
   * Place les têtes de série de manière optimale
   */
  generateBalancedSeeding(seededPlayers: SeededPlayer[]): SeededPlayer[] {
    const playerCount = seededPlayers.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(playerCount)));

    // Optimal slot ordering for balanced bracket placement
    const bracketOrder: number[] = [];

    // Generate bracket placement order via standard algorithm
    this.generateBracketOrder(bracketOrder, 1, nextPowerOfTwo, false);

    // Reorder players according to bracket order
    const reorderedPlayers: SeededPlayer[] = [];

    for (let i = 0; i < playerCount; i++) {
      const bracketPosition = bracketOrder[i];
      if (bracketPosition <= playerCount) {
        const playerIndex = bracketPosition - 1;
        if (seededPlayers[playerIndex]) {
          reorderedPlayers.push({
            ...seededPlayers[playerIndex],
            seed: i + 1, // Updated seed based on bracket position
          });
        }
      }
    }

    return reorderedPlayers;
  }

  /**
   * Recursive algorithm generating optimal bracket placement order.
   */
  private generateBracketOrder(
    order: number[],
    start: number,
    end: number,
    reverse: boolean,
  ): void {
    if (start === end) {
      order.push(start);
      return;
    }

    const mid = Math.floor((start + end) / 2);

    if (!reverse) {
      this.generateBracketOrder(order, start, mid, false);
      this.generateBracketOrder(order, mid + 1, end, true);
    } else {
      this.generateBracketOrder(order, mid + 1, end, true);
      this.generateBracketOrder(order, start, mid, false);
    }
  }

  /**
   * Validates that seed numbers are unique and sequential.
   */
  validateSeeding(seededPlayers: SeededPlayer[]): boolean {
    // Verify that all seeds are unique and sequential
    const seeds = seededPlayers.map((p) => p.seed).sort((a, b) => a - b);

    for (let i = 0; i < seeds.length; i++) {
      if (seeds[i] !== i + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retrieves player stats for seeding purposes.
   */
  async getPlayerSeedingStats(playerId: number): Promise<{
    avgPoints: number;
    avgWinRate: number;
    tournamentCount: number;
    bestRank: number;
    recentForm: number;
  }> {
    const stats = await this.rankingRepository
      .createQueryBuilder("ranking")
      .leftJoin("ranking.tournament", "tournament")
      .where("ranking.playerId = :playerId", { playerId })
      .select([
        "AVG(ranking.points) as avgPoints",
        "AVG(ranking.winRate) as avgWinRate",
        "COUNT(ranking.id) as tournamentCount",
        "MIN(ranking.rank) as bestRank",
      ])
      .getRawOne<PlayerDetailedStats>();

    // Retrieve last 5 tournaments for recent form calculation
    const recentRankings = await this.rankingRepository
      .createQueryBuilder("ranking")
      .leftJoin("ranking.tournament", "tournament")
      .where("ranking.playerId = :playerId", { playerId })
      .orderBy("tournament.startDate", "DESC")
      .limit(5)
      .getMany();

    const recentForm =
      recentRankings.length > 0
        ? recentRankings.reduce((sum, r) => sum + r.points, 0) /
          recentRankings.length
        : 0;

    return {
      avgPoints: parseFloat(stats?.avgPoints || "0") || 0,
      avgWinRate: parseFloat(stats?.avgWinRate || "0") || 0,
      tournamentCount: parseInt(stats?.tournamentCount || "0") || 0,
      bestRank: parseInt(stats?.bestRank || "999") || 999,
      recentForm,
    };
  }
}
