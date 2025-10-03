import {
  Injectable,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from '../entities/tournament.entity';
import {
  Match,
  MatchStatus,
  MatchPhase
} from '../../match/entities/match.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../entities/tournament-registration.entity';
import { BracketService } from './bracket.service';
import { SeedingService, SeedingMethod } from './seeding.service';
import { RankingService } from '../../ranking/ranking.service';
import { MatchService } from '../../match/match.service';

export interface StartTournamentOptions {
  seedingMethod?: SeedingMethod;
  generateAllRounds?: boolean;
  checkInRequired?: boolean;
}

export interface AdvanceRoundResult {
  newRound: number;
  matchesCreated: number;
  playersAdvanced: number;
  playersEliminated: number;
}

@Injectable()
export class TournamentOrchestrationService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    private bracketService: BracketService,
    private seedingService: SeedingService,
    private rankingService: RankingService,
    private matchService: MatchService,
    private dataSource: DataSource
  ) {}

  /**
   * Démarre un tournoi : génère les brackets/pairings et crée les premiers matches
   */
  async startTournament(
    tournamentId: number,
    options: StartTournamentOptions = {}
  ): Promise<Tournament> {
    return this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: tournamentId },
        relations: ['registrations', 'registrations.player']
      });

      if (!tournament) {
        throw new NotFoundException('Tournoi non trouvé');
      }

      this.validateTournamentStart(tournament, options.checkInRequired);

      const bracketStructure =
        await this.bracketService.generateBracket(tournamentId);

      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 1;
      tournament.totalRounds = bracketStructure.totalRounds;

      await manager.save(tournament);

      void this.rankingService.updateTournamentRankings(tournamentId);

      return tournament;
    });
  }

  /**
   * Passe au round suivant (pour Swiss et Round Robin)
   */
  async advanceToNextRound(tournamentId: number): Promise<AdvanceRoundResult> {
    return this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: tournamentId },
        relations: ['matches', 'registrations', 'registrations.player']
      });

      if (!tournament) {
        throw new NotFoundException('Tournoi non trouvé');
      }

      if (tournament.status !== TournamentStatus.IN_PROGRESS) {
        throw new BadRequestException('Le tournoi doit être en cours');
      }

      // Vérifier que tous les matches du round actuel sont terminés
      const currentRoundMatches = tournament.matches.filter(
        (match) => match.round === tournament.currentRound
      );

      const unfinishedMatches = currentRoundMatches.filter(
        (match) =>
          match.status !== MatchStatus.FINISHED &&
          match.status !== MatchStatus.FORFEIT
      );

      if (unfinishedMatches.length > 0) {
        throw new BadRequestException(
          `${unfinishedMatches.length} match(es) du round ${tournament.currentRound} ne sont pas terminé(s)`
        );
      }

      void this.rankingService.updateTournamentRankings(tournamentId);

      const newRound = tournament.currentRound! + 1;
      let matchesCreated = 0;
      let playersAdvanced = 0;
      let playersEliminated = 0;

      if (tournament.type === TournamentType.SWISS_SYSTEM) {
        // Générer les paires pour le round suivant
        if (newRound <= tournament.totalRounds!) {
          const swissPairings = await this.bracketService.generateSwissPairings(
            tournamentId,
            newRound
          );

          for (const pairing of swissPairings.pairings) {
            if (pairing.playerB) {
              void this.matchService.create({
                tournamentId: tournament.id,
                playerAId: pairing.playerA.id,
                playerBId: pairing.playerB.id,
                round: newRound,
                phase: MatchPhase.QUALIFICATION,
                scheduledDate: new Date(),
                notes: `Round ${newRound} - Table ${pairing.tableNumber}`
              });
              matchesCreated++;
            }
          }

          playersAdvanced = swissPairings.pairings.length;
        }
      } else if (tournament.type === TournamentType.ROUND_ROBIN) {
        playersAdvanced = tournament.registrations.filter(
          (reg) => reg.status === RegistrationStatus.CONFIRMED
        ).length;
      } else if (
        tournament.type === TournamentType.SINGLE_ELIMINATION ||
        tournament.type === TournamentType.DOUBLE_ELIMINATION
      ) {
        const result = await this.advanceEliminationRound(
          tournament,
          newRound,
          manager
        );
        matchesCreated = result.matchesCreated;
        playersAdvanced = result.playersAdvanced;
        playersEliminated = result.playersEliminated;
      }

      if (
        newRound > tournament.totalRounds! ||
        this.isTournamentComplete(tournament, newRound)
      ) {
        tournament.status = TournamentStatus.FINISHED;
        tournament.isFinished = true;
      } else {
        tournament.currentRound = newRound;
      }

      await manager.save(tournament);

      return {
        newRound,
        matchesCreated,
        playersAdvanced,
        playersEliminated
      };
    });
  }

  /**
   * Termine un tournoi manuellement
   */
  async finishTournament(tournamentId: number): Promise<Tournament> {
    return this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new NotFoundException('Tournoi non trouvé');
      }

      if (tournament.status === TournamentStatus.FINISHED) {
        throw new BadRequestException('Le tournoi est déjà terminé');
      }

      void this.rankingService.updateTournamentRankings(tournamentId);

      // Marquer les joueurs non éliminés comme éliminés au round actuel
      const activeRegistrations = await manager.find(TournamentRegistration, {
        where: {
          tournament: { id: tournamentId },
          status: RegistrationStatus.CONFIRMED
        }
      });

      for (const registration of activeRegistrations) {
        if (!registration.eliminatedAt) {
          registration.eliminatedAt = new Date();
          registration.eliminatedRound = tournament.currentRound || 0;
          await manager.save(registration);
        }
      }

      tournament.status = TournamentStatus.FINISHED;
      tournament.isFinished = true;

      return manager.save(tournament);
    });
  }

  /**
   * Annule un tournoi
   */
  async cancelTournament(
    tournamentId: number,
    reason?: string
  ): Promise<Tournament> {
    return this.dataSource.transaction(async (manager) => {
      const tournament = await manager.findOne(Tournament, {
        where: { id: tournamentId }
      });

      if (!tournament) {
        throw new NotFoundException('Tournoi non trouvé');
      }

      if (tournament.status === TournamentStatus.FINISHED) {
        throw new BadRequestException(
          "Impossible d'annuler un tournoi terminé"
        );
      }

      // Annuler tous les matches en cours
      await manager.update(
        Match,
        { tournament: { id: tournamentId }, status: MatchStatus.SCHEDULED },
        { status: MatchStatus.CANCELLED }
      );

      tournament.status = TournamentStatus.CANCELLED;
      if (reason) {
        tournament.additionalInfo = `Annulé: ${reason}`;
      }

      return manager.save(tournament);
    });
  }

  /**
   * Récupère les statistiques en temps réel d'un tournoi
   */
  async getTournamentProgress(tournamentId: number): Promise<{
    status: TournamentStatus;
    currentRound: number;
    totalRounds: number;
    completedMatches: number;
    totalMatches: number;
    activePlayers: number;
    eliminatedPlayers: number;
    progressPercentage: number;
  }> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ['matches', 'registrations']
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi non trouvé');
    }

    const completedMatches = tournament.matches.filter(
      (match) =>
        match.status === MatchStatus.FINISHED ||
        match.status === MatchStatus.FORFEIT
    ).length;

    const eliminatedPlayers = tournament.registrations.filter(
      (reg) => reg.eliminatedAt !== null
    ).length;

    const activePlayers = tournament.registrations.filter(
      (reg) => reg.status === RegistrationStatus.CONFIRMED && !reg.eliminatedAt
    ).length;

    let progressPercentage = 0;
    if (tournament.totalRounds && tournament.totalRounds > 0) {
      progressPercentage =
        ((tournament.currentRound || 0) / tournament.totalRounds) * 100;
    }

    return {
      status: tournament.status,
      currentRound: tournament.currentRound || 0,
      totalRounds: tournament.totalRounds || 0,
      completedMatches,
      totalMatches: tournament.matches.length,
      activePlayers,
      eliminatedPlayers,
      progressPercentage
    };
  }

  /**
   * Valide qu'un tournoi peut être démarré
   */
  private validateTournamentStart(
    tournament: Tournament,
    checkInRequired: boolean = false
  ): void {
    if (tournament.status !== TournamentStatus.REGISTRATION_CLOSED) {
      throw new BadRequestException(
        'Le tournoi doit être en statut "inscriptions fermées" pour être démarré'
      );
    }

    // Compter les joueurs confirmés et check-in si requis
    let eligiblePlayers = tournament.registrations.filter(
      (reg) => reg.status === RegistrationStatus.CONFIRMED
    );

    if (checkInRequired) {
      eligiblePlayers = eligiblePlayers.filter((reg) => reg.checkedIn);
    }

    if (eligiblePlayers.length < (tournament.minPlayers || 2)) {
      throw new BadRequestException(
        `Pas assez de joueurs pour démarrer le tournoi (${eligiblePlayers.length}/${tournament.minPlayers || 2})`
      );
    }

    if (
      tournament.maxPlayers &&
      eligiblePlayers.length > tournament.maxPlayers
    ) {
      throw new BadRequestException(
        `Trop de joueurs pour ce tournoi (${eligiblePlayers.length}/${tournament.maxPlayers})`
      );
    }
  }

  /**
   * Avance un round en élimination
   */
  private async advanceEliminationRound(
    tournament: Tournament,
    newRound: number,
    manager: EntityManager
  ): Promise<{
    matchesCreated: number;
    playersAdvanced: number;
    playersEliminated: number;
  }> {
    const previousRoundMatches = tournament.matches.filter(
      (match) => match.round === newRound - 1
    );

    let matchesCreated = 0;
    let playersAdvanced = 0;
    let playersEliminated = 0;

    // Créer les matches du round suivant avec les vainqueurs
    const winners: any[] = [];

    for (const match of previousRoundMatches) {
      if (match.winner) {
        winners.push(match.winner);
        playersAdvanced++;
      }

      // Marquer les perdants comme éliminés
      const loser =
        match.playerA?.id === match.winner?.id ? match.playerB : match.playerA;
      if (loser) {
        const registration = await manager.findOne(TournamentRegistration, {
          where: { tournament: { id: tournament.id }, player: { id: loser.id } }
        });

        if (registration && !registration.eliminatedAt) {
          registration.eliminatedAt = new Date();
          registration.eliminatedRound = newRound - 1;
          await manager.save(registration);
          playersEliminated++;
        }
      }
    }

    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        void this.matchService.create({
          tournamentId: tournament.id,
          playerAId: (winners[i] as any).id,
          playerBId: (winners[i + 1] as any).id,
          round: newRound,
          phase: this.getPhaseForRound(newRound, tournament.totalRounds || 0),
          scheduledDate: new Date(),
          notes: `Round ${newRound} - Élimination`
        });
        matchesCreated++;
      }
    }

    return { matchesCreated, playersAdvanced, playersEliminated };
  }

  /**
   * Détermine la phase d'un match selon le round
   */
  private getPhaseForRound(round: number, totalRounds: number): MatchPhase {
    if (round === totalRounds) return MatchPhase.FINAL;
    if (round === totalRounds - 1) return MatchPhase.SEMI_FINAL;
    if (round === totalRounds - 2) return MatchPhase.QUARTER_FINAL;
    return MatchPhase.QUALIFICATION;
  }

  /**
   * Vérifie si un tournoi est terminé
   */
  private isTournamentComplete(
    tournament: Tournament,
    currentRound: number
  ): boolean {
    if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
      const activeRegistrations = tournament.registrations.filter(
        (reg) =>
          reg.status === RegistrationStatus.CONFIRMED && !reg.eliminatedAt
      );
      return activeRegistrations.length <= 1;
    }

    if (
      tournament.type === TournamentType.SWISS_SYSTEM ||
      tournament.type === TournamentType.ROUND_ROBIN
    ) {
      return currentRound > (tournament.totalRounds || 0);
    }

    return false;
  }
}
