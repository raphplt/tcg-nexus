import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CreateRankingDto } from './dto/create-ranking.dto';
import { UpdateRankingDto } from './dto/update-ranking.dto';
import { Ranking } from './entities/ranking.entity';
import {
  Tournament,
  TournamentType
} from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Match } from '../match/entities/match.entity';

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
    private matchRepository: Repository<Match>
  ) {}

  /**
   * Crée un nouveau ranking
   */
  async create(createRankingDto: CreateRankingDto): Promise<Ranking> {
    const { tournamentId, playerId, ...rankingData } = createRankingDto;

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId }
    });
    if (!tournament) {
      throw new NotFoundException('Tournoi non trouvé');
    }

    const player = await this.playerRepository.findOne({
      where: { id: playerId }
    });
    if (!player) {
      throw new NotFoundException('Joueur non trouvé');
    }

    const ranking = this.rankingRepository.create({
      tournament,
      player,
      ...rankingData
    });

    return this.rankingRepository.save(ranking);
  }

  /**
   * Récupère tous les rankings avec filtres
   */
  async findAll(tournamentId?: number): Promise<Ranking[]> {
    const queryBuilder = this.rankingRepository
      .createQueryBuilder('ranking')
      .leftJoinAndSelect('ranking.tournament', 'tournament')
      .leftJoinAndSelect('ranking.player', 'player')
      .orderBy('ranking.rank', 'ASC');

    if (tournamentId) {
      queryBuilder.where('tournament.id = :tournamentId', { tournamentId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Récupère un ranking par ID
   */
  async findOne(id: number): Promise<Ranking> {
    const ranking = await this.rankingRepository.findOne({
      where: { id },
      relations: ['tournament', 'player']
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
    updateRankingDto: UpdateRankingDto
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
      relations: ['player'],
      order: {
        points: 'DESC',
        winRate: 'DESC',
        wins: 'DESC'
      }
    });
  }

  /**
   * Met à jour tous les classements d'un tournoi
   */
  async updateTournamentRankings(
    tournamentId: number,
    manager?: EntityManager
  ): Promise<Ranking[]> {
    const repo = manager || this.rankingRepository;

    const tournament = await (manager || this.tournamentRepository).findOne(
      Tournament,
      {
        where: { id: tournamentId },
        relations: [
          'matches',
          'matches.playerA',
          'matches.playerB',
          'matches.winner'
        ]
      }
    );

    if (!tournament) {
      throw new NotFoundException('Tournoi non trouvé');
    }

    // Calculer les statistiques pour chaque joueur
    const playerStats = await this.calculatePlayerStatistics(tournament);

    // Mettre à jour ou créer les rankings
    const rankings: Ranking[] = [];

    for (const [playerId, stats] of playerStats.entries()) {
      let ranking = await repo.findOne(Ranking, {
        where: { tournament: { id: tournamentId }, player: { id: playerId } }
      });

      if (!ranking) {
        ranking = repo.create(Ranking, {
          tournament: { id: tournamentId } as Tournament,
          player: { id: playerId } as Player,
          rank: 0,
          points: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0
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
    await repo.save(rankings);

    return rankings;
  }

  /**
   * Calcule les statistiques des joueurs d'un tournoi
   */
  private calculatePlayerStatistics(
    tournament: Tournament
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
          gameWinRate: 0
        }
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
        return { win: 1, draw: 0, loss: 0 }; // En élimination, pas de points progressifs

      default:
        return { win: 3, draw: 1, loss: 0 };
    }
  }

  /**
   * Récupère le classement d'un joueur dans un tournoi
   */
  async getPlayerRanking(
    tournamentId: number,
    playerId: number
  ): Promise<Ranking | null> {
    return this.rankingRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } },
      relations: ['tournament', 'player']
    });
  }

  /**
   * Récupère les classements finaux d'un tournoi terminé
   */
  async getFinalRankings(tournamentId: number): Promise<Ranking[]> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi non trouvé');
    }

    return this.getTournamentRankings(tournamentId);
  }

  /**
   * Calcule les tie-breakers pour départager les égalités
   */
  async calculateTieBreakers(
    tournamentId: number,
    playerIds: number[]
  ): Promise<Map<number, { opponentWinRate: number; gameWinRate: number }>> {
    const matches = await this.matchRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: ['playerA', 'playerB', 'winner']
    });

    const tieBreakers = new Map();

    for (const playerId of playerIds) {
      const playerMatches = matches.filter(
        (match) =>
          match.playerA?.id === playerId || match.playerB?.id === playerId
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
            (m.playerA?.id === opponent.id || m.playerB?.id === opponent.id)
        );

        const opponentWins = opponentMatches.filter(
          (m) => m.winner?.id === opponent.id
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
        gameWinRate: totalGames > 0 ? gameWins / totalGames : 0
      });
    }

    return tieBreakers;
  }
}
