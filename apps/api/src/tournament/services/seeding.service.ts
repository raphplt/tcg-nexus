import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../../player/entities/player.entity';
import { Tournament } from '../entities/tournament.entity';
import { Ranking } from '../../ranking/entities/ranking.entity';

export enum SeedingMethod {
  RANDOM = 'random',
  RANKING = 'ranking',
  ELO = 'elo',
  MANUAL = 'manual'
}

export interface SeededPlayer extends Player {
  seed: number;
  ranking?: number;
  elo?: number;
  score?: number;
}

@Injectable()
export class SeedingService {
  constructor(
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>
  ) {}

  /**
   * Génère le seeding des joueurs selon la méthode choisie
   */
  async seedPlayers(
    players: Player[],
    tournament: Tournament,
    method: SeedingMethod = SeedingMethod.RANDOM
  ): Promise<SeededPlayer[]> {
    switch (method) {
      case SeedingMethod.RANDOM:
        return this.randomSeeding(players);

      case SeedingMethod.RANKING:
        return this.rankingBasedSeeding(players);

      case SeedingMethod.ELO:
        return this.eloBasedSeeding(players);

      case SeedingMethod.MANUAL:
        // Pour l'instant, retourne l'ordre donné
        return this.manualSeeding(players);

      default:
        return this.randomSeeding(players);
    }
  }

  /**
   * Seeding aléatoire
   */
  private randomSeeding(players: Player[]): SeededPlayer[] {
    const shuffled = [...players];

    // Algorithme de Fisher-Yates pour un mélange équitable
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.map((player, index) => ({
      ...player,
      seed: index + 1
    }));
  }

  /**
   * Seeding basé sur le ranking global des joueurs
   */
  private async rankingBasedSeeding(
    players: Player[]
  ): Promise<SeededPlayer[]> {
    // Récupérer les rankings globaux des joueurs
    const playerRankings = await this.rankingRepository
      .createQueryBuilder('ranking')
      .select([
        'ranking.playerId',
        'AVG(ranking.points) as avgPoints',
        'AVG(ranking.winRate) as avgWinRate',
        'COUNT(ranking.id) as tournamentCount'
      ])
      .where('ranking.playerId IN (:...playerIds)', {
        playerIds: players.map((p) => p.id)
      })
      .groupBy('ranking.playerId')
      .getRawMany();

    // Créer un map pour un accès rapide
    const rankingMap = new Map<
      number,
      { avgPoints: number; avgWinRate: number; tournamentCount: number }
    >();
    playerRankings.forEach((r: any) => {
      rankingMap.set(parseInt(r.ranking_playerId), {
        avgPoints: parseFloat(r.avgPoints) || 0,
        avgWinRate: parseFloat(r.avgWinRate) || 0,
        tournamentCount: parseInt(r.tournamentCount) || 0
      });
    });

    // Calculer un score composite pour chaque joueur
    const playersWithScores = players.map((player) => {
      const ranking = rankingMap.get(player.id);
      let score = 0;

      if (ranking) {
        // Score basé sur points moyens (70%) et winRate (30%)
        score = ranking.avgPoints * 0.7 + ranking.avgWinRate * 0.3;

        // Bonus pour l'expérience (nombre de tournois)
        score += Math.min(ranking.tournamentCount * 0.5, 5);
      }

      return {
        ...player,
        score,
        ranking: ranking?.avgPoints || 0,
        seed: 0 // Sera défini plus tard
      } as SeededPlayer;
    });

    // Trier par score décroissant
    playersWithScores.sort((a, b) => (b.score || 0) - (a.score || 0));

    return playersWithScores.map((player, index) => ({
      ...player,
      seed: index + 1
    }));
  }

  /**
   * Seeding basé sur l'ELO (si implémenté)
   */
  private async eloBasedSeeding(players: Player[]): Promise<SeededPlayer[]> {
    // TODO: Implémenter quand le système ELO sera disponible
    // Pour l'instant, utilise le ranking
    return this.rankingBasedSeeding(players);
  }

  /**
   * Seeding manuel (ordre donné)
   */
  private manualSeeding(players: Player[]): SeededPlayer[] {
    return players.map((player, index) => ({
      ...player,
      seed: index + 1
    }));
  }

  /**
   * Génère un seeding équilibré pour les brackets
   * Place les têtes de série de manière optimale
   */
  generateBalancedSeeding(seededPlayers: SeededPlayer[]): SeededPlayer[] {
    const playerCount = seededPlayers.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(playerCount)));

    // Ordre de placement optimal pour un bracket équilibré
    const bracketOrder: number[] = [];

    // Génère l'ordre de placement selon l'algorithme standard
    this.generateBracketOrder(bracketOrder, 1, nextPowerOfTwo, false);

    // Réorganise les joueurs selon cet ordre
    const reorderedPlayers: SeededPlayer[] = [];

    for (let i = 0; i < playerCount; i++) {
      const bracketPosition = bracketOrder[i];
      if (bracketPosition <= playerCount) {
        const playerIndex = bracketPosition - 1;
        if (seededPlayers[playerIndex]) {
          reorderedPlayers.push({
            ...seededPlayers[playerIndex],
            seed: i + 1 // Nouveau seed basé sur la position dans le bracket
          });
        }
      }
    }

    return reorderedPlayers;
  }

  /**
   * Algorithme récursif pour générer l'ordre optimal du bracket
   */
  private generateBracketOrder(
    order: number[],
    start: number,
    end: number,
    reverse: boolean
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
   * Valide qu'un seeding est correct
   */
  validateSeeding(seededPlayers: SeededPlayer[]): boolean {
    // Vérifier que tous les seeds sont uniques et séquentiels
    const seeds = seededPlayers.map((p) => p.seed).sort((a, b) => a - b);

    for (let i = 0; i < seeds.length; i++) {
      if (seeds[i] !== i + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Récupère les statistiques d'un joueur pour le seeding
   */
  async getPlayerSeedingStats(playerId: number): Promise<{
    avgPoints: number;
    avgWinRate: number;
    tournamentCount: number;
    bestRank: number;
    recentForm: number; // Performance des 5 derniers tournois
  }> {
    const stats = await this.rankingRepository
      .createQueryBuilder('ranking')
      .leftJoin('ranking.tournament', 'tournament')
      .where('ranking.playerId = :playerId', { playerId })
      .select([
        'AVG(ranking.points) as avgPoints',
        'AVG(ranking.winRate) as avgWinRate',
        'COUNT(ranking.id) as tournamentCount',
        'MIN(ranking.rank) as bestRank'
      ])
      .getRawOne();

    // Récupérer les 5 derniers tournois pour la forme récente
    const recentRankings = await this.rankingRepository
      .createQueryBuilder('ranking')
      .leftJoin('ranking.tournament', 'tournament')
      .where('ranking.playerId = :playerId', { playerId })
      .orderBy('tournament.startDate', 'DESC')
      .limit(5)
      .getMany();

    const recentForm =
      recentRankings.length > 0
        ? recentRankings.reduce((sum, r) => sum + r.points, 0) /
          recentRankings.length
        : 0;

    return {
      avgPoints: parseFloat(stats?.avgPoints) || 0,
      avgWinRate: parseFloat(stats?.avgWinRate) || 0,
      tournamentCount: parseInt(stats?.tournamentCount) || 0,
      bestRank: parseInt(stats?.bestRank) || 999,
      recentForm
    };
  }
}
