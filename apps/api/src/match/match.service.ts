import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import {
  ReportScoreDto,
  StartMatchDto,
  ResetMatchDto
} from './dto/match-operations.dto';
import { Match, MatchStatus, MatchPhase } from './entities/match.entity';
import {
  Tournament,
  TournamentStatus
} from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../tournament/entities/tournament-registration.entity';
import { TournamentType } from '../tournament/entities/tournament.entity';
import { Ranking } from '../ranking/entities/ranking.entity';
import { Statistics } from '../statistics/entities/statistic.entity';

export interface MatchQueryDto {
  tournamentId?: number;
  round?: number;
  phase?: MatchPhase;
  status?: MatchStatus;
  playerId?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    @InjectRepository(Statistics)
    private readonly statisticsRepository: Repository<Statistics>,
    private readonly dataSource: DataSource
  ) {}

  // Créer un nouveau match
  async create(createMatchDto: CreateMatchDto): Promise<Match> {
    const {
      tournamentId,
      playerAId,
      playerBId,
      round,
      phase,
      scheduledDate,
      notes
    } = createMatchDto;

    const tournament: Tournament | null =
      await this.tournamentRepository.findOne({
        where: { id: tournamentId }
      });
    if (!tournament) {
      throw new NotFoundException('Tournoi non trouvé');
    }
    if (tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Le tournoi doit être en cours pour créer des matches'
      );
    }

    // Vérifier que les joueurs existent et sont inscrits
    let playerA: Player | null = null;
    let playerB: Player | null = null;

    if (playerAId != null) {
      playerA = await this.playerRepository.findOne({
        where: { id: playerAId }
      });
      if (!playerA) {
        throw new NotFoundException(
          `Joueur A avec l'ID ${playerAId} non trouvé`
        );
      }
      const registrationA: TournamentRegistration | null =
        await this.registrationRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            player: { id: playerAId },
            status: RegistrationStatus.CONFIRMED
          }
        });
      if (!registrationA) {
        throw new BadRequestException(
          `Le joueur A n'est pas inscrit à ce tournoi`
        );
      }
    }

    if (playerBId != null) {
      playerB = await this.playerRepository.findOne({
        where: { id: playerBId }
      });
      if (!playerB) {
        throw new NotFoundException(
          `Joueur B avec l'ID ${playerBId} non trouvé`
        );
      }
      const registrationB: TournamentRegistration | null =
        await this.registrationRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            player: { id: playerBId },
            status: RegistrationStatus.CONFIRMED
          }
        });
      if (!registrationB) {
        throw new BadRequestException(
          `Le joueur B n'est pas inscrit à ce tournoi`
        );
      }
    }

    if (!tournament || !playerA || !playerB) {
      throw new BadRequestException('Données invalides');
    }
    if (!round || !phase || !scheduledDate || !notes) {
      throw new BadRequestException('Données invalides');
    }

    const matchData: Partial<Match> = {
      tournament,
      playerA: playerA || undefined,
      playerB: playerB || undefined,
      round,
      phase,
      scheduledDate,
      notes,
      status: MatchStatus.SCHEDULED
    };

    const match = this.matchRepository.create(matchData);

    return this.matchRepository.save(match);
  }

  // Récupérer tous les matches avec filtres
  async findAll(query: MatchQueryDto) {
    const {
      tournamentId,
      round,
      phase,
      status,
      playerId,
      page = 1,
      limit = 10
    } = query;

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.tournament', 'tournament')
      .leftJoinAndSelect('match.playerA', 'playerA')
      .leftJoinAndSelect('match.playerB', 'playerB')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.statistics', 'statistics');

    if (tournamentId != null) {
      qb.andWhere('tournament.id = :tournamentId', { tournamentId });
    }
    if (round != null) {
      qb.andWhere('match.round = :round', { round });
    }
    if (phase != null) {
      qb.andWhere('match.phase = :phase', { phase });
    }
    if (status != null) {
      qb.andWhere('match.status = :status', { status });
    }
    if (playerId != null) {
      qb.andWhere('(playerA.id = :playerId OR playerB.id = :playerId)', {
        playerId
      });
    }

    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);
    qb.orderBy('match.round', 'ASC').addOrderBy('match.phase', 'ASC');

    const [matches, total] = await qb.getManyAndCount();

    return {
      matches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Récupérer un match par ID
  async findOne(id: number): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['tournament', 'playerA', 'playerB', 'winner', 'statistics']
    });

    if (!match) {
      throw new NotFoundException(`Match avec l'ID ${id} non trouvé`);
    }
    return match;
  }

  // Mettre à jour un match
  async update(id: number, updateMatchDto: UpdateMatchDto): Promise<Match> {
    const match = await this.findOne(id);
    if (match.status === MatchStatus.FINISHED) {
      throw new BadRequestException('Impossible de modifier un match terminé');
    }
    Object.assign(match, updateMatchDto);
    return this.matchRepository.save(match);
  }

  // Supprimer un match
  async remove(id: number): Promise<void> {
    const match = await this.findOne(id);
    if (
      match.status === MatchStatus.IN_PROGRESS ||
      match.status === MatchStatus.FINISHED
    ) {
      throw new BadRequestException(
        'Impossible de supprimer un match en cours ou terminé'
      );
    }
    await this.matchRepository.remove(match);
  }

  // Démarrer un match
  async startMatch(id: number, startMatchDto: StartMatchDto): Promise<Match> {
    const match = await this.findOne(id);
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new BadRequestException(
        'Seuls les matches programmés peuvent être démarrés'
      );
    }
    if (!match.playerA || !match.playerB) {
      throw new BadRequestException(
        'Le match doit avoir deux joueurs pour être démarré'
      );
    }
    match.status = MatchStatus.IN_PROGRESS;
    match.startedAt = new Date();
    if (startMatchDto.notes) {
      match.notes = startMatchDto.notes;
    }
    return this.matchRepository.save(match);
  }

  // Reporter un score
  async reportScore(
    id: number,
    reportScoreDto: ReportScoreDto
  ): Promise<Match> {
    const match = await this.findOne(id);
    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Seuls les matches en cours peuvent recevoir des scores'
      );
    }

    const { playerAScore, playerBScore, isForfeit, notes } = reportScoreDto;

    return this.dataSource.transaction<Match>(
      async (manager: EntityManager) => {
        // Mettre à jour le match
        match.playerAScore = playerAScore;
        match.playerBScore = playerBScore;
        match.finishedAt = new Date();

        if (isForfeit) {
          match.status = MatchStatus.FORFEIT;
          // Si forfait, on infère le vainqueur par le score fourni (ou adapte ta logique ici)
          match.winner =
            playerAScore > playerBScore
              ? (match.playerA ?? null)
              : (match.playerB ?? null);
        } else {
          match.status = MatchStatus.FINISHED;
          if (playerAScore > playerBScore) {
            match.winner = match.playerA ?? null;
          } else if (playerBScore > playerAScore) {
            match.winner = match.playerB ?? null;
          } else {
            match.winner = undefined;
          }
        }

        if (notes) {
          match.notes = notes;
        }

        const savedMatch = await manager.save(Match, match);

        if (match.winner) {
          await this.updateRankings(match, manager);
        }
        await this.createMatchStatistics(match, manager);

        // Vérifier si le tournoi peut avancer automatiquement
        await this.checkTournamentProgression(match, manager);

        return savedMatch;
      }
    );
  }

  // Annuler un résultat de match (pour les juges)
  async resetMatch(id: number, resetMatchDto: ResetMatchDto): Promise<Match> {
    const match = await this.findOne(id);
    if (
      match.status !== MatchStatus.FINISHED &&
      match.status !== MatchStatus.FORFEIT
    ) {
      throw new BadRequestException(
        'Seuls les matches terminés peuvent être réinitialisés'
      );
    }

    return this.dataSource.transaction<Match>(
      async (manager: EntityManager) => {
        match.status = MatchStatus.SCHEDULED;
        match.playerAScore = 0;
        match.playerBScore = 0;
        match.winner = undefined;
        match.startedAt = undefined;
        match.finishedAt = undefined;

        if (resetMatchDto.reason) {
          match.notes = `Réinitialisé: ${resetMatchDto.reason}`;
        }

        const savedMatch = await manager.save(Match, match);

        await manager.delete(Statistics, { match: { id } });

        return savedMatch;
      }
    );
  }

  // Récupérer les matches d'un tournoi par round
  async getMatchesByRound(
    tournamentId: number,
    round: number
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        tournament: { id: tournamentId },
        round
      },
      relations: ['playerA', 'playerB', 'winner'],
      order: { phase: 'ASC' }
    });
  }

  // Récupérer les matches d'un joueur dans un tournoi
  async getPlayerMatches(
    tournamentId: number,
    playerId: number
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { tournament: { id: tournamentId }, playerA: { id: playerId } },
        { tournament: { id: tournamentId }, playerB: { id: playerId } }
      ],
      relations: ['playerA', 'playerB', 'winner'],
      order: { round: 'ASC', phase: 'ASC' }
    });
  }

  // =================== Private ===================

  private async updateRankings(
    match: Match,
    manager: EntityManager
  ): Promise<void> {
    if (!match.winner || !match.playerA || !match.playerB) return;

    const tournamentId = match.tournament.id;
    const winnerId = match.winner.id;
    const loserId =
      match.playerA.id === winnerId ? match.playerB.id : match.playerA.id;

    // Gagnant
    let winnerRanking =
      (await manager.findOne(Ranking, {
        where: { tournament: { id: tournamentId }, player: { id: winnerId } }
      })) ?? null;

    if (winnerRanking) {
      winnerRanking.wins += 1;
      winnerRanking.points += 3;
    } else {
      winnerRanking = manager.create(Ranking, {
        tournament: { id: tournamentId },
        player: { id: winnerId },
        wins: 1,
        losses: 0,
        draws: 0,
        points: 3,
        rank: 0,
        winRate: 100
      });
    }

    // Perdant
    let loserRanking =
      (await manager.findOne(Ranking, {
        where: { tournament: { id: tournamentId }, player: { id: loserId } }
      })) ?? null;

    if (loserRanking) {
      loserRanking.losses += 1;
    } else {
      loserRanking = manager.create(Ranking, {
        tournament: { id: tournamentId },
        player: { id: loserId },
        wins: 0,
        losses: 1,
        draws: 0,
        points: 0,
        rank: 0,
        winRate: 0
      });
    }

    const winnerTotal =
      winnerRanking.wins + winnerRanking.losses + winnerRanking.draws;
    const loserTotal =
      loserRanking.wins + loserRanking.losses + loserRanking.draws;

    winnerRanking.winRate =
      winnerTotal > 0 ? (winnerRanking.wins / winnerTotal) * 100 : 0;
    loserRanking.winRate =
      loserTotal > 0 ? (loserRanking.wins / loserTotal) * 100 : 0;

    await manager.save([winnerRanking, loserRanking]);
  }

  private async createMatchStatistics(
    match: Match,
    manager: EntityManager
  ): Promise<void> {
    const players = [match.playerA, match.playerB].filter((p): p is Player =>
      Boolean(p)
    );

    for (const player of players) {
      const isWinner = player.id === match.winner?.id;
      const isPlayerA = player.id === match.playerA?.id;
      const score = isPlayerA ? match.playerAScore : match.playerBScore;
      const opponentScore = isPlayerA ? match.playerBScore : match.playerAScore;

      const stat = manager.create(Statistics, {
        match,
        player,
        points: score,
        opponentPoints: opponentScore,
        isWinner,
        isPlayerA
      });

      await manager.save(stat);
    }
  }

  /**
   * Vérifie si le tournoi peut progresser automatiquement
   */
  private async checkTournamentProgression(
    match: Match,
    manager: EntityManager
  ): Promise<void> {
    const tournament = await manager.findOne(Tournament, {
      where: { id: match.tournament.id },
      relations: ['matches']
    });

    if (!tournament) return;

    // Vérifier si tous les matches du round actuel sont terminés
    const currentRoundMatches = tournament.matches.filter(
      (m) => m.round === tournament.currentRound
    );

    const unfinishedMatches = currentRoundMatches.filter(
      (m) =>
        m.status !== MatchStatus.FINISHED && m.status !== MatchStatus.FORFEIT
    );

    // Si tous les matches du round sont terminés, on peut potentiellement avancer
    if (unfinishedMatches.length === 0) {
      // Pour l'élimination, propager automatiquement les vainqueurs
      if (
        tournament.type === TournamentType.SINGLE_ELIMINATION ||
        tournament.type === TournamentType.DOUBLE_ELIMINATION
      ) {
        await this.propagateEliminationWinners(tournament, manager);
      }
    }
  }

  /**
   * Propage les vainqueurs dans un bracket d'élimination
   */
  private async propagateEliminationWinners(
    tournament: Tournament,
    manager: EntityManager
  ): Promise<void> {
    const currentRound = tournament.currentRound || 1;
    const nextRound = currentRound + 1;

    // Récupérer les matches du round actuel avec vainqueurs
    const currentRoundMatches = tournament.matches.filter(
      (m) => m.round === currentRound && m.winner
    );

    if (currentRoundMatches.length === 0) return;

    // Créer les matches du round suivant si pas déjà créés
    const nextRoundMatches = tournament.matches.filter(
      (m) => m.round === nextRound
    );

    if (nextRoundMatches.length === 0 && currentRoundMatches.length > 1) {
      // Créer les nouveaux matches
      const winners = currentRoundMatches.map((m) => m.winner!);

      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          const newMatch = manager.create(Match, {
            tournament,
            playerA: winners[i],
            playerB: winners[i + 1],
            round: nextRound,
            phase: this.getPhaseForRound(
              nextRound,
              tournament.totalRounds || 0
            ) as any,
            status: MatchStatus.SCHEDULED,
            scheduledDate: new Date()
          });

          await manager.save(Match, newMatch);
        }
      }

      // Mettre à jour le round du tournoi
      tournament.currentRound = nextRound;
      await manager.save(Tournament, tournament);
    }
  }

  /**
   * Détermine la phase selon le round et le total
   */
  private getPhaseForRound(round: number, totalRounds: number): MatchPhase {
    if (round === totalRounds) return MatchPhase.FINAL;
    if (round === totalRounds - 1) return MatchPhase.SEMI_FINAL;
    if (round === totalRounds - 2) return MatchPhase.QUARTER_FINAL;
    return MatchPhase.QUALIFICATION;
  }
}
