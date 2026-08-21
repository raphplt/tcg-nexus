import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { UserRole } from "../common/enums/user";
import { PaginationHelper } from "../helpers/pagination";
import { UpdateMatchDto } from "../match/dto/update-match.dto";
import { MatchStatus } from "../match/entities/match.entity";
import { MatchService } from "../match/match.service";
import { Player } from "../player/entities/player.entity";
import { RankingService } from "../ranking/ranking.service";
import { User } from "../user/entities/user.entity";
import {
  BulkRegistrationAction,
  BulkRegistrationActionDto,
} from "./dto/bulk-registration-action.dto";
import { CreateTournamentDto } from "./dto/create-tournament.dto";
import { TournamentQueryDto } from "./dto/tournament-query.dto";
import { TournamentRegistrationDto } from "./dto/tournament-registration.dto";
import { UpdateTournamentDto } from "./dto/update-tournament.dto";
import { UpdateTournamentStatusDto } from "./dto/update-tournament-status.dto";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "./entities/tournament.entity";
import {
  OrganizerRole,
  TournamentOrganizer,
} from "./entities/tournament-organizer.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "./entities/tournament-registration.entity";
import { BracketService } from "./services/bracket.service";
import { SeedingMethod, SeedingService } from "./services/seeding.service";
import { TournamentOrchestrationService } from "./services/tournament-orchestration.service";
import { TournamentStateService } from "./services/tournament-state.service";

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private bracketService: BracketService,
    private seedingService: SeedingService,
    private orchestrationService: TournamentOrchestrationService,
    private stateService: TournamentStateService,
    private rankingService: RankingService,
    private matchService: MatchService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new tournament and initializes the creator as OWNER organizer.
   *
   * @param createTournamentDto Creation DTO.
   * @param userId Creator user ID.
   * @returns Newly saved Tournament entity.
   */
  async create(
    createTournamentDto: CreateTournamentDto,
    userId: number,
  ): Promise<Tournament> {
    const tournament = this.tournamentRepository.create(createTournamentDto);
    this.validateTournamentConfiguration(tournament, true);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
      });
    }

    return this.tournamentRepository.manager.transaction(async (manager) => {
      const tournamentRepository = manager.getRepository(Tournament);
      const organizerRepository = manager.getRepository(TournamentOrganizer);
      const savedTournament = await tournamentRepository.save(tournament);
      const organizer = organizerRepository.create({
        tournament: savedTournament,
        user,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: OrganizerRole.OWNER,
        isActive: true,
      });

      await organizerRepository.save(organizer);
      return savedTournament;
    });
  }

  /**
   * Retrieves paginated list of tournaments matching filter query parameters.
   *
   * @param query Query and filter options.
   * @returns Paginated result of tournaments.
   */
  async findAll(query: TournamentQueryDto) {
    const {
      search,
      status,
      type,
      location,
      isPublic,
      startDateFrom,
      startDateTo,
      page = 1,
      limit = 10,
      sortBy = "startDate",
      sortOrder = "ASC",
    } = query;

    const queryBuilder = this.tournamentRepository
      .createQueryBuilder("tournament")
      .leftJoinAndSelect("tournament.players", "players")
      .leftJoinAndSelect("tournament.registrations", "registrations")
      .leftJoinAndSelect("tournament.pricing", "pricing")
      .leftJoinAndSelect("tournament.rewards", "rewards")
      .leftJoinAndSelect("tournament.organizers", "organizers");

    // Search filters
    if (search) {
      queryBuilder.andWhere(
        "(tournament.name ILIKE :search OR tournament.description ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere("tournament.status = :status", { status });
    }

    if (type) {
      queryBuilder.andWhere("tournament.type = :type", { type });
    }

    if (location) {
      queryBuilder.andWhere("tournament.location ILIKE :location", {
        location: `%${location}%`,
      });
    }

    if (isPublic !== undefined) {
      queryBuilder.andWhere("tournament.isPublic = :isPublic", { isPublic });
    }

    if (startDateFrom) {
      queryBuilder.andWhere("tournament.startDate >= :startDateFrom", {
        startDateFrom,
      });
    }
    if (startDateTo) {
      queryBuilder.andWhere("tournament.startDate <= :startDateTo", {
        startDateTo,
      });
    }

    // Paginate results using helper
    return PaginationHelper.paginateQueryBuilder(
      queryBuilder,
      { page, limit },
      sortBy ? `tournament.${sortBy}` : undefined,
      sortOrder,
    );
  }

  /**
   * Retrieves a single tournament by ID with full relations.
   *
   * @param id Tournament ID.
   * @returns Tournament entity.
   */
  async findOne(id: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
      relations: [
        "players",
        "players.user",
        "matches",
        "matches.playerA",
        "matches.playerA.user",
        "matches.playerB",
        "matches.playerB.user",
        "rankings",
        "rankings.player",
        "rankings.player.user",
        "registrations",
        "registrations.player",
        "registrations.player.user",
        "rewards",
        "pricing",
        "organizers",
        "notifications",
      ],
    });

    if (!tournament) {
      throw new NotFoundException(`Tournoi avec l'ID ${id} non trouvé`);
    }

    return tournament;
  }

  /**
   * Updates tournament configuration parameters.
   *
   * @param id Tournament ID.
   * @param updateTournamentDto Partial updates.
   * @returns Updated Tournament.
   */
  async update(
    id: number,
    updateTournamentDto: UpdateTournamentDto,
  ): Promise<Tournament> {
    const tournament = await this.findOne(id);

    // Verify whether the tournament can be modified
    if (
      tournament.status === TournamentStatus.IN_PROGRESS ||
      tournament.status === TournamentStatus.FINISHED
    ) {
      throw new BadRequestException(
        "Impossible de modifier un tournoi en cours ou terminé",
      );
    }

    const updatedTournament = {
      ...tournament,
      ...updateTournamentDto,
    } as Tournament;
    this.validateTournamentConfiguration(
      updatedTournament,
      updateTournamentDto.type !== undefined ||
        updateTournamentDto.isExternal !== undefined,
    );

    Object.assign(tournament, updateTournamentDto);
    return this.tournamentRepository.save(tournament);
  }

  /**
   * Removes a tournament from the database.
   *
   * @param id Tournament ID.
   * @param requestingUser Requesting user entity for permission check.
   */
  async remove(id: number, requestingUser?: User): Promise<void> {
    const tournament = await this.findOne(id);

    const isAdminOrModerator =
      requestingUser?.role === UserRole.ADMIN ||
      requestingUser?.role === UserRole.MODERATOR;

    if (!isAdminOrModerator && tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        "Seuls les tournois en brouillon peuvent être supprimés",
      );
    }

    await this.tournamentRepository.remove(tournament);
  }

  /**
   * Updates tournament status via orchestration state transition machine.
   *
   * @param id Tournament ID.
   * @param updateStatusDto Target status and reason.
   * @returns Updated Tournament.
   */
  async updateStatus(
    id: number,
    updateStatusDto: UpdateTournamentStatusDto,
  ): Promise<Tournament> {
    const { reason, status } = updateStatusDto;

    if (status === TournamentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        "Utilisez l'action de démarrage du tournoi afin de générer le bracket",
      );
    }

    if (status === TournamentStatus.FINISHED) {
      throw new BadRequestException(
        "Utilisez l'action de fin du tournoi afin de valider les résultats",
      );
    }

    if (status === TournamentStatus.CANCELLED) {
      return this.orchestrationService.cancelTournament(id, reason);
    }

    return this.stateService.transitionState(id, status, reason);
  }

  /**
   * Retrieves available state transitions for a tournament.
   */
  async getAvailableTransitions(id: number) {
    return this.stateService.getStateHistory(id);
  }

  /**
   * Validates a target state transition.
   */
  async validateStateTransition(id: number, targetStatus: TournamentStatus) {
    return this.stateService.validateStateTransition(id, targetStatus);
  }

  /**
   * Registers a player for a tournament.
   */
  /**
   * Resolves the player profile attached to a user account.
   *
   * L'utilisateur porté par le token n'embarque plus la relation `player` :
   * elle est résolue ici, au moment où on en a besoin.
   *
   * @param userId Identifiant de l'utilisateur authentifié.
   * @returns Identifiant du joueur, ou null si le profil n'existe pas.
   */
  async findPlayerIdByUserId(userId: number): Promise<number | null> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
      select: { id: true },
    });
    return player?.id ?? null;
  }

  async registerPlayer(
    registrationDto: TournamentRegistrationDto,
  ): Promise<TournamentRegistration> {
    const { tournamentId, playerId, notes } = registrationDto;
    const { registration, userId } =
      await this.tournamentRepository.manager.transaction(async (manager) => {
        const tournamentRepository = manager.getRepository(Tournament);
        const registrationRepository = manager.getRepository(
          TournamentRegistration,
        );
        const playerRepository = manager.getRepository(Player);

        // Serialize registrations for a tournament so two requests cannot claim
        // the last available slot at the same time.
        const lockedTournament = await tournamentRepository.findOne({
          where: { id: tournamentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!lockedTournament) {
          throw new NotFoundException({
            code: "TOURNAMENT_NOT_FOUND",
            message: "Tournoi non trouvé",
          });
        }

        const tournament = await tournamentRepository.findOne({
          where: { id: tournamentId },
          relations: ["players"],
        });
        if (!tournament) {
          throw new NotFoundException({
            code: "TOURNAMENT_NOT_FOUND",
            message: "Tournoi non trouvé",
          });
        }

        const player = await playerRepository.findOne({
          where: { id: playerId },
          relations: ["user"],
        });
        if (!player) {
          throw new NotFoundException(
            `Joueur avec l'ID ${playerId} non trouvé`,
          );
        }

        if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
          throw new BadRequestException(
            "Les inscriptions ne sont pas ouvertes",
          );
        }

        const registeredAt = new Date();
        const isLateRegistration = Boolean(
          tournament.registrationDeadline &&
            registeredAt > tournament.registrationDeadline,
        );
        if (isLateRegistration && !tournament.allowLateRegistration) {
          throw new BadRequestException(
            "La date limite d'inscription est dépassée et les inscriptions tardives ne sont pas autorisées",
          );
        }

        const existingRegistration = await registrationRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            player: { id: playerId },
          },
        });
        if (
          existingRegistration &&
          existingRegistration.status !== RegistrationStatus.CANCELLED
        ) {
          throw new ConflictException(
            "Le joueur est déjà inscrit à ce tournoi",
          );
        }

        const confirmedRegistrations = await registrationRepository.count({
          where: {
            tournament: { id: tournamentId },
            status: RegistrationStatus.CONFIRMED,
          },
        });
        const tournamentIsFull = Boolean(
          tournament.maxPlayers &&
            confirmedRegistrations >= tournament.maxPlayers,
        );
        const registrationStatus = tournamentIsFull
          ? RegistrationStatus.WAITLISTED
          : tournament.requiresApproval || isLateRegistration
            ? RegistrationStatus.PENDING
            : RegistrationStatus.CONFIRMED;

        const registrationToSave =
          existingRegistration ??
          registrationRepository.create({ tournament, player });
        registrationToSave.status = registrationStatus;
        registrationToSave.notes = notes ?? "";
        registrationToSave.registeredAt = registeredAt;
        registrationToSave.checkedIn = false;
        registrationToSave.checkedInAt = null;

        const savedRegistration =
          await registrationRepository.save(registrationToSave);

        tournament.players = tournament.players || [];
        if (registrationStatus === RegistrationStatus.CONFIRMED) {
          if (!tournament.players.some((entry) => entry.id === player.id)) {
            tournament.players.push(player);
          }
        } else {
          tournament.players = tournament.players.filter(
            (entry) => entry.id !== player.id,
          );
        }
        await tournamentRepository.save(tournament);

        return {
          registration: savedRegistration,
          userId: player.user?.id,
        };
      });

    if (userId) {
      this.eventEmitter.emit("challenge.action", {
        userId,
        action: "JOIN_TOURNAMENT",
      });
    }
    return registration;
  }

  /**
   * Unregisters a player from a tournament.
   */
  async unregisterPlayer(
    tournamentId: number,
    playerId: number,
  ): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } },
      select: { id: true },
    });

    if (!registration) {
      throw new NotFoundException({
        code: "REGISTRATION_NOT_FOUND",
        message: "Inscription non trouvée",
      });
    }

    await this.updateRegistrationsInBulk(tournamentId, {
      registrationIds: [registration.id],
      action: BulkRegistrationAction.CANCEL,
    });
  }

  /**
   * Retrieves all tournaments associated with a specific player.
   */
  async getPlayerTournaments(playerId: number, query: TournamentQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "startDate",
      sortOrder = "DESC",
    } = query;

    const queryBuilder = this.tournamentRepository
      .createQueryBuilder("tournament")
      .leftJoin("tournament.players", "player")
      .leftJoinAndSelect("tournament.pricing", "pricing")
      .leftJoinAndSelect("tournament.rewards", "rewards")
      .where("player.id = :playerId", { playerId });

    return PaginationHelper.paginateQueryBuilder(
      queryBuilder,
      { page, limit },
      sortBy ? `tournament.${sortBy}` : undefined,
      sortOrder,
    );
  }

  /**
   * Retrieves all tournaments organized by a specific user.
   *
   * @param userId User identifier who organized tournaments.
   * @param query Pagination and filtering parameters.
   * @returns Paginated tournaments list with pricing, rewards, and organizers relations.
   */
  async getOrganizerTournaments(userId: number, query: TournamentQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "startDate",
      sortOrder = "DESC",
    } = query;

    const queryBuilder = this.tournamentRepository
      .createQueryBuilder("tournament")
      .innerJoin("tournament.organizers", "organizer")
      .leftJoinAndSelect("tournament.pricing", "pricing")
      .leftJoinAndSelect("tournament.rewards", "rewards")
      .leftJoinAndSelect("tournament.organizers", "allOrganizers")
      .where("organizer.user.id = :userId", { userId });

    return PaginationHelper.paginateQueryBuilder(
      queryBuilder,
      { page, limit },
      sortBy ? `tournament.${sortBy}` : undefined,
      sortOrder,
    );
  }

  /**
   * Retrieves upcoming public tournaments.
   */
  async getUpcomingTournaments(limit: number = 10): Promise<Tournament[]> {
    return this.tournamentRepository.find({
      where: {
        startDate: MoreThanOrEqual(new Date()),
        isPublic: true,
        status: In([
          TournamentStatus.REGISTRATION_OPEN,
          TournamentStatus.REGISTRATION_CLOSED,
        ]),
      },
      order: { startDate: "ASC" },
      take: limit,
      relations: ["pricing", "rewards"],
    });
  }

  /**
   * Retrieves past public tournaments.
   */
  async getPastTournaments(limit: number = 10): Promise<Tournament[]> {
    return this.tournamentRepository.find({
      where: {
        startDate: LessThan(new Date()),
        isPublic: true,
      },
      order: { startDate: "DESC" },
      take: limit,
      relations: ["pricing", "rewards"],
    });
  }

  /**
   * Retrieves tournament statistics summary.
   */
  async getTournamentStats(id: number) {
    const tournament = await this.findOne(id);

    const stats = {
      totalPlayers: tournament.players?.length || 0,
      totalMatches: tournament.matches?.length || 0,
      completedMatches:
        tournament.matches?.filter((match) => match.finishedAt !== null)
          .length || 0,
      currentRound: tournament.currentRound || 0,
      totalRounds: tournament.totalRounds || 0,
      registrations: {
        confirmed:
          tournament.registrations?.filter(
            (reg) => reg.status === RegistrationStatus.CONFIRMED,
          ).length || 0,
        pending:
          tournament.registrations?.filter(
            (reg) => reg.status === RegistrationStatus.PENDING,
          ).length || 0,
        cancelled:
          tournament.registrations?.filter(
            (reg) => reg.status === RegistrationStatus.CANCELLED,
          ).length || 0,
      },
    };

    return stats;
  }

  private getValidStatusTransitions(
    currentStatus: TournamentStatus,
  ): TournamentStatus[] {
    const transitions = {
      [TournamentStatus.DRAFT]: [
        TournamentStatus.REGISTRATION_OPEN,
        TournamentStatus.CANCELLED,
      ],
      [TournamentStatus.REGISTRATION_OPEN]: [
        TournamentStatus.REGISTRATION_CLOSED,
        TournamentStatus.CANCELLED,
      ],
      [TournamentStatus.REGISTRATION_CLOSED]: [
        TournamentStatus.IN_PROGRESS,
        TournamentStatus.CANCELLED,
      ],
      [TournamentStatus.IN_PROGRESS]: [
        TournamentStatus.FINISHED,
        TournamentStatus.CANCELLED,
      ],
      [TournamentStatus.FINISHED]: [],
      [TournamentStatus.CANCELLED]: [],
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Démarre un tournoi
   */
  async startTournament(
    tournamentId: number,
    options?: { seedingMethod?: string; checkInRequired?: boolean },
  ) {
    const seedingMethod =
      (options?.seedingMethod as SeedingMethod) || SeedingMethod.RANDOM;
    return this.orchestrationService.startTournament(tournamentId, {
      seedingMethod,
      checkInRequired: options?.checkInRequired,
    });
  }

  /**
   * Termine un tournoi
   */
  async finishTournament(tournamentId: number) {
    return this.orchestrationService.finishTournament(tournamentId);
  }

  /**
   * Annule un tournoi
   */
  async cancelTournament(tournamentId: number, reason?: string) {
    return this.orchestrationService.cancelTournament(tournamentId, reason);
  }

  /**
   * Passe au round suivant
   */
  async advanceToNextRound(tournamentId: number) {
    return this.orchestrationService.advanceToNextRound(tournamentId);
  }

  /**
   * Récupère le bracket d'un tournoi
   */
  async getBracket(tournamentId: number) {
    return this.bracketService.getBracket(tournamentId);
  }

  /**
   * Récupère les paires du round actuel
   */
  async getCurrentPairings(tournamentId: number, round?: number) {
    const tournament = await this.findOne(tournamentId);
    const targetRound = round || tournament.currentRound || 1;

    // Une lecture publique ne doit jamais recalculer ni randomiser des
    // appariements. Les matchs persistés constituent l'unique source de vérité.
    return this.matchService.getMatchesByRound(tournamentId, targetRound);
  }

  /**
   * Récupère les classements d'un tournoi
   */
  getTournamentRankings(tournamentId: number) {
    return this.rankingService.getTournamentRankings(tournamentId);
  }

  /**
   * Récupère le progrès d'un tournoi
   */
  getTournamentProgress(tournamentId: number) {
    return this.orchestrationService.getTournamentProgress(tournamentId);
  }

  /**
   * Récupère les matches d'un tournoi
   */
  getTournamentMatches(
    tournamentId: number,
    filters?: {
      round?: number;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.matchService.findAll({
      tournamentId,
      round: filters?.round,
      status: filters?.status as MatchStatus,
      page: filters?.page,
      limit: Math.min(Math.max(filters?.limit ?? 100, 1), 1000),
    });
  }

  /**
   * Returns the user's currently pending match in the given tournament, if any.
   */
  async getMyPendingMatch(tournamentId: number, userId: number) {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!player) {
      return null;
    }

    const match = await this.matchService.findPendingTournamentMatchForPlayer(
      tournamentId,
      player.id,
    );

    if (!match) {
      return null;
    }

    return {
      matchId: match.id,
      round: match.round,
      phase: match.phase,
      status: match.status,
      playerA: match.playerA
        ? { id: match.playerA.id, name: match.playerA.user?.email ?? null }
        : null,
      playerB: match.playerB
        ? { id: match.playerB.id, name: match.playerB.user?.email ?? null }
        : null,
      onlineSession: match.onlineSession
        ? {
            id: match.onlineSession.id,
            status: match.onlineSession.status,
          }
        : null,
    };
  }

  /**
   * Récupère un match spécifique d'un tournoi
   */
  async getTournamentMatch(tournamentId: number, matchId: number) {
    const match = await this.matchService.findOne(matchId);

    if (!match) {
      throw new NotFoundException({
        code: "MATCH_NOT_FOUND",
        message: "Match non trouvé",
      });
    }

    if (match.tournament?.id !== tournamentId) {
      throw new NotFoundException({
        code: "MATCH_NOT_IN_TOURNAMENT",
        message: "Match non trouvé dans ce tournoi",
      });
    }

    return match;
  }

  /**
   * Met à jour un match d'un tournoi (score, statut)
   */
  async updateTournamentMatch(
    tournamentId: number,
    matchId: number,
    updateData: {
      playerAScore?: number;
      playerBScore?: number;
      status?: string;
    },
  ) {
    const match = await this.getTournamentMatch(tournamentId, matchId);
    const requestedStatus = updateData.status?.toLowerCase();
    const isFinalResult =
      requestedStatus === MatchStatus.FINISHED ||
      requestedStatus === MatchStatus.FORFEIT;
    const includesScore =
      updateData.playerAScore !== undefined ||
      updateData.playerBScore !== undefined;

    if (requestedStatus === MatchStatus.IN_PROGRESS) {
      if (match.status !== MatchStatus.SCHEDULED) {
        throw new BadRequestException(
          "Seul un match programmé peut être démarré",
        );
      }
      return this.matchService.startMatch(matchId, {});
    }

    if (includesScore && !isFinalResult) {
      throw new BadRequestException(
        "Un score doit être enregistré avec un statut final",
      );
    }

    if (isFinalResult) {
      if (match.status === MatchStatus.SCHEDULED) {
        await this.matchService.startMatch(matchId, {});
      } else if (match.status !== MatchStatus.IN_PROGRESS) {
        throw new BadRequestException(
          "Ce résultat ne peut plus être modifié directement",
        );
      }

      return this.matchService.reportScore(matchId, {
        playerAScore: updateData.playerAScore ?? match.playerAScore ?? 0,
        playerBScore: updateData.playerBScore ?? match.playerBScore ?? 0,
        isForfeit: requestedStatus === MatchStatus.FORFEIT,
      });
    }

    return this.matchService.update(matchId, updateData as UpdateMatchDto);
  }

  startTournamentMatchesInBulk(tournamentId: number, matchIds: number[]) {
    return this.matchService.startMatches(tournamentId, matchIds);
  }

  /**
   * Récupère les inscriptions d'un tournoi
   */
  async getTournamentRegistrations(tournamentId: number, status?: string) {
    const queryBuilder = this.registrationRepository
      .createQueryBuilder("registration")
      .leftJoinAndSelect("registration.player", "player")
      .leftJoinAndSelect("registration.payments", "payments")
      .where("registration.tournament.id = :tournamentId", { tournamentId });

    if (status) {
      queryBuilder.andWhere("registration.status = :status", { status });
    }

    return queryBuilder.orderBy("registration.registeredAt", "ASC").getMany();
  }

  async updateRegistrationsInBulk(
    tournamentId: number,
    actionDto: BulkRegistrationActionDto,
  ): Promise<{
    action: BulkRegistrationAction;
    updatedCount: number;
    registrations: TournamentRegistration[];
    promotedCount: number;
    promotedRegistrations: TournamentRegistration[];
  }> {
    const result = await this.tournamentRepository.manager.transaction(
      async (manager) => {
        const tournamentRepository = manager.getRepository(Tournament);
        const registrationRepository = manager.getRepository(
          TournamentRegistration,
        );

        const lockedTournament = await tournamentRepository.findOne({
          where: { id: tournamentId },
          lock: { mode: "pessimistic_write" },
        });
        if (!lockedTournament) {
          throw new NotFoundException({
            code: "TOURNAMENT_NOT_FOUND",
            message: "Tournoi non trouvé",
          });
        }

        const tournament = await tournamentRepository.findOne({
          where: { id: tournamentId },
          relations: ["players"],
        });
        if (!tournament) {
          throw new NotFoundException({
            code: "TOURNAMENT_NOT_FOUND",
            message: "Tournoi non trouvé",
          });
        }
        this.ensureRegistrationsCanBeManaged(tournament);

        const registrations = await registrationRepository.find({
          where: {
            id: In(actionDto.registrationIds),
            tournament: { id: tournamentId },
          },
          relations: ["player"],
        });

        if (registrations.length !== actionDto.registrationIds.length) {
          throw new NotFoundException(
            "Une ou plusieurs inscriptions sont introuvables dans ce tournoi",
          );
        }

        switch (actionDto.action) {
          case BulkRegistrationAction.CONFIRM: {
            const invalidRegistration = registrations.find(
              (registration) =>
                registration.status === RegistrationStatus.CONFIRMED ||
                registration.status === RegistrationStatus.ELIMINATED,
            );
            if (invalidRegistration) {
              throw new BadRequestException(
                `L'inscription ${invalidRegistration.id} ne peut pas être confirmée`,
              );
            }

            const confirmedCount = await registrationRepository.count({
              where: {
                tournament: { id: tournamentId },
                status: RegistrationStatus.CONFIRMED,
              },
            });
            if (
              tournament.maxPlayers &&
              confirmedCount + registrations.length > tournament.maxPlayers
            ) {
              throw new BadRequestException(
                `La confirmation dépasserait la capacité du tournoi (${tournament.maxPlayers} joueurs)`,
              );
            }

            tournament.players = tournament.players || [];
            for (const registration of registrations) {
              registration.status = RegistrationStatus.CONFIRMED;
              registration.checkedIn = false;
              registration.checkedInAt = null;
              if (
                !tournament.players.some(
                  (player) => player.id === registration.player.id,
                )
              ) {
                tournament.players.push(registration.player);
              }
            }
            await tournamentRepository.save(tournament);
            break;
          }

          case BulkRegistrationAction.CANCEL: {
            const invalidRegistration = registrations.find(
              (registration) =>
                registration.status === RegistrationStatus.CANCELLED ||
                registration.status === RegistrationStatus.ELIMINATED,
            );
            if (invalidRegistration) {
              throw new BadRequestException(
                `L'inscription ${invalidRegistration.id} ne peut pas être annulée`,
              );
            }

            const cancelledPlayerIds = new Set(
              registrations.map((registration) => registration.player.id),
            );
            tournament.players = (tournament.players || []).filter(
              (player) => !cancelledPlayerIds.has(player.id),
            );
            for (const registration of registrations) {
              registration.status = RegistrationStatus.CANCELLED;
              registration.checkedIn = false;
              registration.checkedInAt = null;
              if (actionDto.reason) {
                registration.notes = `Annulée: ${actionDto.reason}`;
              }
            }
            await tournamentRepository.save(tournament);
            break;
          }

          case BulkRegistrationAction.CHECK_IN: {
            const invalidRegistration = registrations.find(
              (registration) =>
                registration.status !== RegistrationStatus.CONFIRMED ||
                registration.checkedIn,
            );
            if (invalidRegistration) {
              throw new BadRequestException(
                `L'inscription ${invalidRegistration.id} ne peut pas être enregistrée au check-in`,
              );
            }

            const checkedInAt = new Date();
            for (const registration of registrations) {
              registration.checkedIn = true;
              registration.checkedInAt = checkedInAt;
            }
            break;
          }
        }

        const savedRegistrations =
          await registrationRepository.save(registrations);
        const promotedRegistrations =
          actionDto.action === BulkRegistrationAction.CANCEL
            ? await this.promoteWaitlistedRegistrations(
                tournament,
                tournamentRepository,
                registrationRepository,
              )
            : [];

        return {
          action: actionDto.action,
          updatedCount: savedRegistrations.length,
          registrations: savedRegistrations,
          promotedCount: promotedRegistrations.length,
          promotedRegistrations,
        };
      },
    );

    for (const registration of result.promotedRegistrations) {
      if (registration.player.user?.id) {
        this.eventEmitter.emit("tournament.registration.promoted", {
          tournamentId,
          registrationId: registration.id,
          userId: registration.player.user.id,
          status: registration.status,
        });
      }
    }

    return result;
  }

  /**
   * Confirme une inscription
   */
  async confirmRegistration(tournamentId: number, registrationId: number) {
    const result = await this.updateRegistrationsInBulk(tournamentId, {
      registrationIds: [registrationId],
      action: BulkRegistrationAction.CONFIRM,
    });
    return result.registrations[0];
  }

  /**
   * Annule une inscription
   */
  async cancelRegistration(
    tournamentId: number,
    registrationId: number,
    reason?: string,
  ) {
    const result = await this.updateRegistrationsInBulk(tournamentId, {
      registrationIds: [registrationId],
      action: BulkRegistrationAction.CANCEL,
      reason,
    });
    return result.registrations[0];
  }

  /**
   * Check-in d'un joueur
   */
  async checkInPlayer(
    tournamentId: number,
    registrationId: number,
    user: User,
  ) {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, tournament: { id: tournamentId } },
      relations: ["tournament", "player", "player.user"],
    });

    if (!registration) {
      throw new NotFoundException({
        code: "REGISTRATION_NOT_FOUND",
        message: "Inscription non trouvée",
      });
    }

    const isOwnRegistration = registration.player.user?.id === user.id;
    const isPlatformStaff =
      user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
    const organizer = isOwnRegistration
      ? null
      : await this.organizerRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            user: { id: user.id },
            isActive: true,
          },
        });

    if (!isOwnRegistration && !isPlatformStaff && !organizer) {
      throw new ForbiddenException(
        "Vous ne pouvez pas effectuer le check-in de cette inscription",
      );
    }

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException(
        "L'inscription doit être confirmée pour faire le check-in",
      );
    }

    this.ensureRegistrationsCanBeManaged(registration.tournament);

    if (registration.checkedIn) {
      throw new BadRequestException({
        code: "CHECK_IN_ALREADY_DONE",
        message: "Check-in déjà effectué",
      });
    }

    const result = await this.updateRegistrationsInBulk(tournamentId, {
      registrationIds: [registrationId],
      action: BulkRegistrationAction.CHECK_IN,
    });
    return result.registrations[0];
  }

  // Remplir un tournoi avec des joueurs aléatoires (admin only)
  async fillWithRandomPlayers(
    tournamentId: number,
    count: number = 8,
  ): Promise<{
    registeredCount: number;
    registrations: TournamentRegistration[];
  }> {
    return this.tournamentRepository.manager.transaction(async (manager) => {
      const tournamentRepository = manager.getRepository(Tournament);
      const registrationRepository = manager.getRepository(
        TournamentRegistration,
      );
      const playerRepository = manager.getRepository(Player);

      const lockedTournament = await tournamentRepository.findOne({
        where: { id: tournamentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedTournament) {
        throw new NotFoundException({
          code: "TOURNAMENT_NOT_FOUND",
          message: "Tournoi non trouvé",
        });
      }

      const tournament = await tournamentRepository.findOne({
        where: { id: tournamentId },
        relations: ["players"],
      });
      if (!tournament) {
        throw new NotFoundException({
          code: "TOURNAMENT_NOT_FOUND",
          message: "Tournoi non trouvé",
        });
      }
      if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
        throw new BadRequestException(
          "Les inscriptions doivent être ouvertes pour remplir le tournoi",
        );
      }

      const existingRegistrations = await registrationRepository.find({
        where: { tournament: { id: tournamentId } },
        relations: ["player"],
      });
      const confirmedCount = existingRegistrations.filter(
        (registration) => registration.status === RegistrationStatus.CONFIRMED,
      ).length;
      const availableSlots = tournament.maxPlayers
        ? Math.max(tournament.maxPlayers - confirmedCount, 0)
        : count;
      if (availableSlots === 0) {
        throw new BadRequestException("Le tournoi est complet");
      }

      const existingPlayerIds = existingRegistrations.map(
        (registration) => registration.player.id,
      );
      const queryBuilder = playerRepository
        .createQueryBuilder("player")
        .leftJoinAndSelect("player.user", "user")
        .where("user.isActive = :isActive", { isActive: true });

      if (existingPlayerIds.length > 0) {
        queryBuilder.andWhere("player.id NOT IN (:...existingPlayerIds)", {
          existingPlayerIds,
        });
      }

      const playersToRegister = await queryBuilder
        .take(Math.min(count, availableSlots))
        .getMany();
      if (playersToRegister.length === 0) {
        throw new BadRequestException(
          "Aucun joueur disponible pour inscription",
        );
      }

      const registeredAt = new Date();
      const registrations = playersToRegister.map((player) =>
        registrationRepository.create({
          tournament,
          player,
          notes: "Inscription automatique (admin)",
          registeredAt,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          checkedInAt: registeredAt,
        }),
      );
      const savedRegistrations =
        await registrationRepository.save(registrations);

      tournament.players = tournament.players || [];
      for (const player of playersToRegister) {
        if (
          !tournament.players.some((candidate) => candidate.id === player.id)
        ) {
          tournament.players.push(player);
        }
      }
      await tournamentRepository.save(tournament);

      return {
        registeredCount: savedRegistrations.length,
        registrations: savedRegistrations,
      };
    });
  }

  // Check-in tous les joueurs confirmés (admin only)
  async checkInAllPlayers(tournamentId: number): Promise<{
    checkedInCount: number;
  }> {
    return this.tournamentRepository.manager.transaction(async (manager) => {
      const tournamentRepository = manager.getRepository(Tournament);
      const registrationRepository = manager.getRepository(
        TournamentRegistration,
      );

      const tournament = await tournamentRepository.findOne({
        where: { id: tournamentId },
        lock: { mode: "pessimistic_write" },
      });
      if (!tournament) {
        throw new NotFoundException({
          code: "TOURNAMENT_NOT_FOUND",
          message: "Tournoi non trouvé",
        });
      }
      this.ensureRegistrationsCanBeManaged(tournament);

      const registrations = await registrationRepository.find({
        where: {
          tournament: { id: tournamentId },
          status: RegistrationStatus.CONFIRMED,
          checkedIn: false,
        },
      });
      const checkedInAt = new Date();
      for (const registration of registrations) {
        registration.checkedIn = true;
        registration.checkedInAt = checkedInAt;
      }
      if (registrations.length > 0) {
        await registrationRepository.save(registrations);
      }

      return {
        checkedInCount: registrations.length,
      };
    });
  }

  private validateTournamentConfiguration(
    tournament: Tournament,
    enforceExternalRegistrationUrl = false,
  ): void {
    if (
      enforceExternalRegistrationUrl &&
      tournament.isExternal &&
      !tournament.externalRegistrationUrl
    ) {
      throw new BadRequestException(
        "Le lien de la plateforme externe est requis",
      );
    }

    if (tournament.startDate >= tournament.endDate) {
      throw new BadRequestException(
        "La date de début doit être antérieure à la date de fin",
      );
    }

    if (
      tournament.registrationDeadline &&
      tournament.registrationDeadline >= tournament.startDate
    ) {
      throw new BadRequestException(
        "La date limite d'inscription doit être antérieure à la date de début",
      );
    }

    if (
      tournament.minPlayers &&
      tournament.maxPlayers &&
      tournament.minPlayers > tournament.maxPlayers
    ) {
      throw new BadRequestException(
        "Le nombre minimum de joueurs ne peut pas être supérieur au maximum",
      );
    }

    if (
      tournament.ageRestrictionMin !== undefined &&
      tournament.ageRestrictionMax !== undefined &&
      tournament.ageRestrictionMin > tournament.ageRestrictionMax
    ) {
      throw new BadRequestException(
        "L'âge minimum ne peut pas être supérieur à l'âge maximum",
      );
    }
  }

  private ensureRegistrationsCanBeManaged(tournament: Tournament): void {
    if (
      tournament.status !== TournamentStatus.REGISTRATION_OPEN &&
      tournament.status !== TournamentStatus.REGISTRATION_CLOSED
    ) {
      throw new BadRequestException(
        "Les inscriptions ne peuvent être modifiées que pendant la phase d'inscription",
      );
    }
  }

  private async promoteWaitlistedRegistrations(
    tournament: Tournament,
    tournamentRepository: Repository<Tournament>,
    registrationRepository: Repository<TournamentRegistration>,
  ): Promise<TournamentRegistration[]> {
    if (!tournament.maxPlayers) {
      return [];
    }

    const confirmedCount = await registrationRepository.count({
      where: {
        tournament: { id: tournament.id },
        status: RegistrationStatus.CONFIRMED,
      },
    });
    const availableSlots = Math.max(tournament.maxPlayers - confirmedCount, 0);
    if (availableSlots === 0) {
      return [];
    }

    const waitlistedRegistrations = await registrationRepository.find({
      where: {
        tournament: { id: tournament.id },
        status: RegistrationStatus.WAITLISTED,
      },
      relations: ["player", "player.user"],
      order: { registeredAt: "ASC", id: "ASC" },
      take: availableSlots,
    });
    const registrationsToPromote = waitlistedRegistrations.filter(
      (registration) => registration.status === RegistrationStatus.WAITLISTED,
    );
    if (registrationsToPromote.length === 0) {
      return [];
    }

    tournament.players = tournament.players || [];
    for (const registration of registrationsToPromote) {
      const isLateRegistration = Boolean(
        tournament.registrationDeadline &&
          registration.registeredAt > tournament.registrationDeadline,
      );
      registration.status =
        tournament.requiresApproval || isLateRegistration
          ? RegistrationStatus.PENDING
          : RegistrationStatus.CONFIRMED;
      registration.checkedIn = false;
      registration.checkedInAt = null;

      if (
        registration.status === RegistrationStatus.CONFIRMED &&
        !tournament.players.some(
          (player) => player.id === registration.player.id,
        )
      ) {
        tournament.players.push(registration.player);
      }
    }

    const promotedRegistrations = await registrationRepository.save(
      registrationsToPromote,
    );
    await tournamentRepository.save(tournament);
    return promotedRegistrations;
  }
}
