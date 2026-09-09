import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { Match, MatchStatus } from "../../match/entities/match.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";

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
        (t) => !!t.registrationDeadline && t.registrationDeadline > new Date(),
        (t) => !!t.minPlayers && t.minPlayers >= 2,
        (t) => !t.maxPlayers || !t.minPlayers || t.maxPlayers >= t.minPlayers,
      ],
      description: "Ouvrir les inscriptions",
    },
    {
      from: TournamentStatus.DRAFT,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: "Annuler le tournoi",
    },

    // REGISTRATION_OPEN transitions
    {
      from: TournamentStatus.REGISTRATION_OPEN,
      to: TournamentStatus.REGISTRATION_CLOSED,
      conditions: [],
      description: "Fermer les inscriptions",
    },
    {
      from: TournamentStatus.REGISTRATION_OPEN,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: "Annuler le tournoi",
    },

    // REGISTRATION_CLOSED transitions
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.IN_PROGRESS,
      conditions: [
        (t) => this.hasMinimumPlayers(t),
        (t) => this.allRequiredPlayersCheckedIn(t),
      ],
      description: "Démarrer le tournoi",
    },
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.REGISTRATION_OPEN,
      conditions: [
        (t) => !t.registrationDeadline || t.registrationDeadline > new Date(),
      ],
      description: "Rouvrir les inscriptions",
    },
    {
      from: TournamentStatus.REGISTRATION_CLOSED,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: "Annuler le tournoi",
    },

    // IN_PROGRESS transitions
    {
      from: TournamentStatus.IN_PROGRESS,
      to: TournamentStatus.FINISHED,
      conditions: [
        (t) => this.allMatchesCompleted(t),
        (t) => this.isLastRoundCompleted(t),
      ],
      description: "Terminer le tournoi",
    },
    {
      from: TournamentStatus.IN_PROGRESS,
      to: TournamentStatus.CANCELLED,
      conditions: [],
      description: "Annuler le tournoi",
    },

    // FINISHED and CANCELLED are terminal states
  ];

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  /**
   * Validates whether a state transition is permissible according to tournament rules.
   *
   * @param tournamentId - Tournament unique identifier.
   * @param targetStatus - Target status to transition to.
   * @returns Validation outcome with actionable errors and warnings.
   */
  async validateStateTransition(
    tournamentId: number,
    targetStatus: TournamentStatus,
  ): Promise<StateValidationResult> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: ["registrations", "matches"],
    });

    if (!tournament) {
      return {
        canTransition: false,
        errors: ["Tournament not found"],
        warnings: [],
      };
    }

    const rule = this.transitionRules.find(
      (r) => r.from === tournament.status && r.to === targetStatus,
    );

    if (!rule) {
      return {
        canTransition: false,
        errors: [
          `Transition from ${tournament.status} to ${targetStatus} is not authorized`,
        ],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Evaluate transition conditions
    for (const condition of rule.conditions) {
      try {
        const result = await condition(tournament);
        if (!result) {
          errors.push(`Condition not met for ${rule.description}`);
        }
      } catch (error) {
        errors.push(`Error during validation: ${(error as Error).message}`);
      }
    }

    // Add contextual warnings based on tournament capacity
    if (targetStatus === TournamentStatus.IN_PROGRESS) {
      const confirmedCount = await this.getConfirmedPlayersCount(tournamentId);
      if (
        tournament.maxPlayers &&
        confirmedCount > tournament.maxPlayers * 0.8
      ) {
        warnings.push("Le tournoi est presque complet");
      }
    }

    return {
      canTransition: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Retrieves permissible target transitions from the current tournament status.
   *
   * @param currentStatus - Current tournament status.
   * @returns List of reachable target statuses.
   */
  getAvailableTransitions(currentStatus: TournamentStatus): TournamentStatus[] {
    return this.transitionRules
      .filter((rule) => rule.from === currentStatus)
      .map((rule) => rule.to);
  }

  /**
   * Retrieves the operational description for a state transition.
   *
   * @param from - Source status.
   * @param to - Target status.
   * @returns Description of the transition rule.
   */
  getTransitionDescription(
    from: TournamentStatus,
    to: TournamentStatus,
  ): string {
    const rule = this.transitionRules.find(
      (r) => r.from === from && r.to === to,
    );
    return rule?.description || "Transition inconnue";
  }

  /**
   * Executes a state transition with validation and side effects.
   *
   * @param tournamentId - Tournament unique identifier.
   * @param targetStatus - Next target status transition.
   * @param reason - Optional transition rationale.
   * @returns Updated tournament entity.
   * @throws BadRequestException If transition is invalid according to state machine rules.
   */
  async transitionState(
    tournamentId: number,
    targetStatus: TournamentStatus,
    reason?: string,
  ): Promise<Tournament> {
    const validation = await this.validateStateTransition(
      tournamentId,
      targetStatus,
    );

    if (!validation.canTransition) {
      throw new BadRequestException(
        `Unable to transition state: ${validation.errors.join(", ")}`,
      );
    }

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournament not found",
      });
    }

    const previousStatus = tournament.status;
    tournament.status = targetStatus;

    this.executeTransitionActions(
      tournament,
      previousStatus,
      targetStatus,
      reason,
    );

    return this.tournamentRepository.save(tournament);
  }

  /**
   * Verifies whether the tournament has reached its minimum player threshold.
   *
   * @param tournament - Tournament entity to inspect.
   * @returns True if confirmed player count meets minimum required.
   */
  private async hasMinimumPlayers(tournament: Tournament): Promise<boolean> {
    const confirmedCount = await this.getConfirmedPlayersCount(tournament.id);
    return confirmedCount >= (tournament.minPlayers || 2);
  }

  /**
   * Checks whether all required players have checked in.
   */
  private async allRequiredPlayersCheckedIn(
    tournament: Tournament,
  ): Promise<boolean> {
    // If check-in is not required, condition is always met
    const requiresCheckIn =
      tournament.additionalInfo?.includes("check-in-required");
    if (!requiresCheckIn) return true;

    const confirmedRegistrations = await this.registrationRepository.find({
      where: {
        tournament: { id: tournament.id },
        status: RegistrationStatus.CONFIRMED,
      },
    });

    return confirmedRegistrations.every((reg) => reg.checkedIn);
  }

  /**
   * Verifies whether all tournament matches are completed.
   *
   * @param tournament - Tournament entity to inspect.
   * @returns True if no matches are scheduled or in progress.
   */
  private async allMatchesCompleted(tournament: Tournament): Promise<boolean> {
    const incompleteMatches = await this.matchRepository.count({
      where: {
        tournament: { id: tournament.id },
        status: In([MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS]),
      },
    });

    return incompleteMatches === 0;
  }

  /**
   * Verifies whether the final tournament round has completed.
   *
   * @param tournament - Tournament entity to inspect.
   * @returns True if the final round is finished.
   */
  private async isLastRoundCompleted(tournament: Tournament): Promise<boolean> {
    if (!tournament.totalRounds || !tournament.currentRound) {
      return false;
    }

    // For elimination tournaments, check if a single active player remains
    if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
      const activeRegistrations = await this.registrationRepository.count({
        where: {
          tournament: { id: tournament.id },
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: IsNull(),
        },
      });
      return activeRegistrations <= 1;
    }

    // For other formats, check if final round reached
    return tournament.currentRound >= tournament.totalRounds;
  }

  /**
   * Retrieves count of confirmed player registrations.
   */
  private async getConfirmedPlayersCount(
    tournamentId: number,
  ): Promise<number> {
    return this.registrationRepository.count({
      where: {
        tournament: { id: tournamentId },
        status: RegistrationStatus.CONFIRMED,
      },
    });
  }

  /**
   * Executes side-effect actions for state transition.
   */
  private executeTransitionActions(
    tournament: Tournament,
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    reason?: string,
  ): void {
    switch (toStatus) {
      case TournamentStatus.REGISTRATION_OPEN:
        // Reset cancelled registrations if required
        break;

      case TournamentStatus.IN_PROGRESS:
        // Mark tournament as started, initialize round 1
        tournament.currentRound = 1;
        break;

      case TournamentStatus.FINISHED:
        // Mark tournament as finished, compute rewards
        tournament.isFinished = true;
        break;

      case TournamentStatus.CANCELLED:
        // Record cancellation reason if provided
        if (reason) {
          tournament.additionalInfo =
            `${tournament.additionalInfo || ""}\nAnnulé: ${reason}`.trim();
        }
        break;
    }
  }

  /**
   * Retrieves the transition state history and options for a tournament.
   *
   * @param tournamentId - Tournament unique identifier.
   * @returns State history with available transitions and descriptions.
   */
  async getStateHistory(tournamentId: number): Promise<{
    currentStatus: TournamentStatus;
    availableTransitions: TournamentStatus[];
    transitionDescriptions: { [key in TournamentStatus]?: string };
  }> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const availableTransitions = this.getAvailableTransitions(
      tournament.status,
    );
    const transitionDescriptions: { [key in TournamentStatus]?: string } = {};

    availableTransitions.forEach((status) => {
      transitionDescriptions[status] = this.getTransitionDescription(
        tournament.status,
        status,
      );
    });

    return {
      currentStatus: tournament.status,
      availableTransitions,
      transitionDescriptions,
    };
  }
}
