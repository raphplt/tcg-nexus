import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from '../entities/tournament.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../entities/tournament-registration.entity';
import { Match, MatchStatus } from '../../match/entities/match.entity';

export interface StateTransitionRule {
  from: TournamentStatus;
  to: TournamentStatus;
  conditions: Array<(tournament: Tournament) => Promise<boolean> | boolean>;
  description: string;
}

export interface StateValidationResult {
  canTransition: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class TournamentStateService {
  private readonly transitionRules: StateTransitionRule[] = [
    // DRAFT transitions
    {
      from: TournamentStatus.DRAFT,
      to: TournamentStatus.REGISTRATION_OPEN,
      conditions: [
        (t) => !!t.registrationDeadline,
        (t) => t.registrationDeadline! > new Date(),
        (t) => !!t.minPlayers && t.minPlayers >= 2,
        (t) => !t.maxPlayers || t.maxPlayers >= t.minPlayers!
      ],
      description: 'Ouvrir les inscriptions'
    },
    {
      from: TournamentStatus.DRAFT,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: 'Annuler le tournoi'
    },

    // REGISTRATION_OPEN transitions
    {
      from: TournamentStatus.REGISTRATION_OPEN,
      to: TournamentStatus.REGISTRATION_CLOSED,
      conditions: [],
      description: 'Fermer les inscriptions'
    },
    {
      from: TournamentStatus.REGISTRATION_OPEN,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: 'Annuler le tournoi'
    },

    // REGISTRATION_CLOSED transitions
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.IN_PROGRESS,
      conditions: [
        (t) => this.hasMinimumPlayers(t),
        (t) => this.allRequiredPlayersCheckedIn(t)
      ],
      description: 'Démarrer le tournoi'
    },
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.REGISTRATION_OPEN,
      conditions: [
        (t) => !t.registrationDeadline || t.registrationDeadline > new Date()
      ],
      description: 'Rouvrir les inscriptions'
    },
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: 'Annuler le tournoi'
    },

    // IN_PROGRESS transitions
    {
      from: TournamentStatus.IN_PROGRESS,
      to: TournamentStatus.FINISHED,
      conditions: [
        (t) => this.allMatchesCompleted(t),
        (t) => this.isLastRoundCompleted(t)
      ],
      description: 'Terminer le tournoi'
    },
    {
      from: TournamentStatus.IN_PROGRESS,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: 'Annuler le tournoi'
    }

    // FINISHED et CANCELLED sont des états terminaux
  ];

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>
  ) {}

  /**
   * Valide si une transition d'état est possible
   */
  async validateStateTransition(
    tournamentId: number,
    targetStatus: TournamentStatus
  ): Promise<StateValidationResult> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ['registrations', 'matches']
    });

    if (!tournament) {
      return {
        canTransition: false,
        errors: ['Tournoi non trouvé'],
        warnings: []
      };
    }

    const rule = this.transitionRules.find(
      (r) => r.from === tournament.status && r.to === targetStatus
    );

    if (!rule) {
      return {
        canTransition: false,
        errors: [
          `Transition de ${tournament.status} vers ${targetStatus} non autorisée`
        ],
        warnings: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier toutes les conditions
    for (const condition of rule.conditions) {
      try {
        const result = await condition(tournament);
        if (!result) {
          errors.push(`Condition non remplie pour ${rule.description}`);
        }
      } catch (error) {
        errors.push(
          `Erreur lors de la validation: ${(error as Error).message}`
        );
      }
    }

    // Ajouter des warnings contextuels
    if (targetStatus === TournamentStatus.IN_PROGRESS) {
      const confirmedCount = await this.getConfirmedPlayersCount(tournamentId);
      if (
        tournament.maxPlayers &&
        confirmedCount > tournament.maxPlayers * 0.8
      ) {
        warnings.push('Le tournoi est presque complet');
      }
    }

    return {
      canTransition: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Récupère les transitions possibles depuis l'état actuel
   */
  getAvailableTransitions(currentStatus: TournamentStatus): TournamentStatus[] {
    return this.transitionRules
      .filter((rule) => rule.from === currentStatus)
      .map((rule) => rule.to);
  }

  /**
   * Récupère la description d'une transition
   */
  getTransitionDescription(
    from: TournamentStatus,
    to: TournamentStatus
  ): string {
    const rule = this.transitionRules.find(
      (r) => r.from === from && r.to === to
    );
    return rule?.description || 'Transition inconnue';
  }

  /**
   * Effectue une transition d'état avec validation
   */
  async transitionState(
    tournamentId: number,
    targetStatus: TournamentStatus,
    reason?: string
  ): Promise<Tournament> {
    const validation = await this.validateStateTransition(
      tournamentId,
      targetStatus
    );

    if (!validation.canTransition) {
      throw new BadRequestException(
        `Impossible de changer l'état: ${validation.errors.join(', ')}`
      );
    }

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new BadRequestException('Tournoi non trouvé');
    }

    const previousStatus = tournament.status;
    tournament.status = targetStatus;

    this.executeTransitionActions(
      tournament,
      previousStatus,
      targetStatus,
      reason
    );

    return this.tournamentRepository.save(tournament);
  }

  /**
   * Vérifie si le tournoi a le nombre minimum de joueurs
   */
  private async hasMinimumPlayers(tournament: Tournament): Promise<boolean> {
    const confirmedCount = await this.getConfirmedPlayersCount(tournament.id);
    return confirmedCount >= (tournament.minPlayers || 2);
  }

  /**
   * Vérifie si tous les joueurs requis sont check-in
   */
  private async allRequiredPlayersCheckedIn(
    tournament: Tournament
  ): Promise<boolean> {
    // Si le check-in n'est pas requis, toujours vrai
    const requiresCheckIn =
      tournament.additionalInfo?.includes('check-in-required');
    if (!requiresCheckIn) return true;

    const confirmedRegistrations = await this.registrationRepository.find({
      where: {
        tournament: { id: tournament.id },
        status: RegistrationStatus.CONFIRMED
      }
    });

    return confirmedRegistrations.every((reg) => reg.checkedIn);
  }

  /**
   * Vérifie si tous les matches sont terminés
   */
  private async allMatchesCompleted(tournament: Tournament): Promise<boolean> {
    const incompleteMatches = await this.matchRepository.count({
      where: {
        tournament: { id: tournament.id },
        status: MatchStatus.SCHEDULED
      }
    });

    return incompleteMatches === 0;
  }

  /**
   * Vérifie si le dernier round est terminé
   */
  private async isLastRoundCompleted(tournament: Tournament): Promise<boolean> {
    if (!tournament.totalRounds || !tournament.currentRound) {
      return false;
    }

    // Pour les tournois à élimination, vérifier s'il reste un seul joueur
    if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
      const activeRegistrations = await this.registrationRepository.count({
        where: {
          tournament: { id: tournament.id },
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: IsNull()
        }
      });
      return activeRegistrations <= 1;
    }

    // Pour les autres formats, vérifier si c'est le dernier round
    return tournament.currentRound >= tournament.totalRounds;
  }

  /**
   * Récupère le nombre de joueurs confirmés
   */
  private async getConfirmedPlayersCount(
    tournamentId: number
  ): Promise<number> {
    return this.registrationRepository.count({
      where: {
        tournament: { id: tournamentId },
        status: RegistrationStatus.CONFIRMED
      }
    });
  }

  /**
   * Exécute les actions spécifiques à une transition
   */
  private executeTransitionActions(
    tournament: Tournament,
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    reason?: string
  ): void {
    switch (toStatus) {
      case TournamentStatus.REGISTRATION_OPEN:
        // Réinitialiser les inscriptions annulées si nécessaire
        break;

      case TournamentStatus.IN_PROGRESS:
        // Marquer comme démarré, initialiser currentRound
        tournament.currentRound = 1;
        break;

      case TournamentStatus.FINISHED:
        // Marquer comme terminé, calculer les récompenses
        tournament.isFinished = true;
        break;

      case TournamentStatus.CANCELLED:
        // Enregistrer la raison d'annulation
        if (reason) {
          tournament.additionalInfo =
            `${tournament.additionalInfo || ''}\nAnnulé: ${reason}`.trim();
        }
        break;
    }
  }

  /**
   * Récupère l'historique des transitions d'un tournoi
   */
  async getStateHistory(tournamentId: number): Promise<{
    currentStatus: TournamentStatus;
    availableTransitions: TournamentStatus[];
    transitionDescriptions: { [key in TournamentStatus]?: string };
  }> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new BadRequestException('Tournoi non trouvé');
    }

    const availableTransitions = this.getAvailableTransitions(
      tournament.status
    );
    const transitionDescriptions: { [key in TournamentStatus]?: string } = {};

    availableTransitions.forEach((status) => {
      transitionDescriptions[status] = this.getTransitionDescription(
        tournament.status,
        status
      );
    });

    return {
      currentStatus: tournament.status,
      availableTransitions,
      transitionDescriptions
    };
  }
}
