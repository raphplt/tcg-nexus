import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { UpdateTournamentStatusDto } from './dto/update-tournament-status.dto';
import { TournamentRegistrationDto } from './dto/tournament-registration.dto';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from './entities/tournament.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from './entities/tournament-registration.entity';
import {
  TournamentOrganizer,
  OrganizerRole
} from './entities/tournament-organizer.entity';
import { Player } from '../player/entities/player.entity';
import { User } from '../user/entities/user.entity';
import { PaginationHelper } from '../helpers/pagination';
import { BracketService } from './services/bracket.service';
import { SeedingService, SeedingMethod } from './services/seeding.service';
import { TournamentOrchestrationService } from './services/tournament-orchestration.service';
import { TournamentStateService } from './services/tournament-state.service';
import { RankingService } from '../ranking/ranking.service';
import { MatchService } from '../match/match.service';
import { MatchStatus } from '../match/entities/match.entity';

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
    private matchService: MatchService
  ) {}

  // Créer un nouveau tournoi
  async create(
    createTournamentDto: CreateTournamentDto,
    userId: number
  ): Promise<Tournament> {
    const tournament = this.tournamentRepository.create(createTournamentDto);
    console.log('Creating tournament with data:', tournament);

    // Validation des dates
    if (tournament.startDate >= tournament.endDate) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin'
      );
    }

    if (
      tournament.registrationDeadline &&
      tournament.registrationDeadline >= tournament.startDate
    ) {
      throw new BadRequestException(
        "La date limite d'inscription doit être antérieure à la date de début"
      );
    }

    // Validation des joueurs
    if (
      tournament.minPlayers &&
      tournament.maxPlayers &&
      tournament.minPlayers > tournament.maxPlayers
    ) {
      throw new BadRequestException(
        'Le nombre minimum de joueurs ne peut pas être supérieur au maximum'
      );
    }

    // Sauvegarder le tournoi
    const savedTournament = await this.tournamentRepository.save(tournament);

    // Créer l'organisateur propriétaire
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const organizer = this.organizerRepository.create({
      tournament: savedTournament,
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: OrganizerRole.OWNER,
      isActive: true
    });

    await this.organizerRepository.save(organizer);

    return savedTournament;
  }

  // Récupérer tous les tournois avec filtres et pagination
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
      sortBy = 'startDate',
      sortOrder = 'ASC'
    } = query;

    const queryBuilder = this.tournamentRepository
      .createQueryBuilder('tournament')
      .leftJoinAndSelect('tournament.players', 'players')
      .leftJoinAndSelect('tournament.registrations', 'registrations')
      .leftJoinAndSelect('tournament.pricing', 'pricing')
      .leftJoinAndSelect('tournament.rewards', 'rewards')
      .leftJoinAndSelect('tournament.organizers', 'organizers');

    // Filtres de recherche
    if (search) {
      queryBuilder.andWhere(
        '(tournament.name ILIKE :search OR tournament.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('tournament.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('tournament.type = :type', { type });
    }

    if (location) {
      queryBuilder.andWhere('tournament.location ILIKE :location', {
        location: `%${location}%`
      });
    }

    if (isPublic !== undefined) {
      queryBuilder.andWhere('tournament.isPublic = :isPublic', { isPublic });
    }

    if (startDateFrom) {
      queryBuilder.andWhere('tournament.startDate >= :startDateFrom', {
        startDateFrom
      });
    }
    if (startDateTo) {
      queryBuilder.andWhere('tournament.startDate <= :startDateTo', {
        startDateTo
      });
    }

    // Utilise le helper générique pour la pagination et le tri
    return PaginationHelper.paginateQueryBuilder(
      queryBuilder,
      { page, limit },
      sortBy ? `tournament.${sortBy}` : undefined,
      sortOrder
    );
  }

  // Récupérer un tournoi par ID
  async findOne(id: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
      relations: [
        'players',
        'matches',
        'rankings',
        'registrations',
        'rewards',
        'pricing',
        'organizers',
        'notifications'
      ]
    });

    if (!tournament) {
      throw new NotFoundException(`Tournoi avec l'ID ${id} non trouvé`);
    }

    return tournament;
  }

  // Mettre à jour un tournoi
  async update(
    id: number,
    updateTournamentDto: UpdateTournamentDto
  ): Promise<Tournament> {
    const tournament = await this.findOne(id);

    // Vérifier si le tournoi peut être modifié
    if (
      tournament.status === TournamentStatus.IN_PROGRESS ||
      tournament.status === TournamentStatus.FINISHED
    ) {
      throw new BadRequestException(
        'Impossible de modifier un tournoi en cours ou terminé'
      );
    }

    // Validation des nouvelles données
    if (updateTournamentDto.startDate && updateTournamentDto.endDate) {
      if (updateTournamentDto.startDate >= updateTournamentDto.endDate) {
        throw new BadRequestException(
          'La date de début doit être antérieure à la date de fin'
        );
      }
    }

    Object.assign(tournament, updateTournamentDto);
    return this.tournamentRepository.save(tournament);
  }

  // Supprimer un tournoi
  async remove(id: number): Promise<void> {
    const tournament = await this.findOne(id);

    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(
        'Seuls les tournois en brouillon peuvent être supprimés'
      );
    }

    await this.tournamentRepository.remove(tournament);
  }

  // Mettre à jour le statut d'un tournoi
  async updateStatus(
    id: number,
    updateStatusDto: UpdateTournamentStatusDto
  ): Promise<Tournament> {
    const { status } = updateStatusDto;

    // Utiliser le service de gestion d'état pour valider et effectuer la transition
    return this.stateService.transitionState(id, status);
  }

  // Récupérer les transitions possibles pour un tournoi
  async getAvailableTransitions(id: number) {
    return this.stateService.getStateHistory(id);
  }

  // Valider une transition d'état
  async validateStateTransition(id: number, targetStatus: TournamentStatus) {
    return this.stateService.validateStateTransition(id, targetStatus);
  }

  // Inscrire un joueur à un tournoi
  async registerPlayer(
    registrationDto: TournamentRegistrationDto
  ): Promise<TournamentRegistration> {
    const { tournamentId, playerId, notes } = registrationDto;
    const tournament = await this.findOne(tournamentId);
    const player = await this.playerRepository.findOne({
      where: { id: playerId }
    });
    if (!player) {
      throw new NotFoundException(`Joueur avec l'ID ${playerId} non trouvé`);
    }

    // Vérifications d'inscription
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Les inscriptions ne sont pas ouvertes');
    }

    // Vérifier la date limite d'inscription
    const now = new Date();
    const isLateRegistration =
      tournament.registrationDeadline && now > tournament.registrationDeadline;

    if (isLateRegistration && !tournament.allowLateRegistration) {
      throw new BadRequestException(
        "La date limite d'inscription est dépassée et les inscriptions tardives ne sont pas autorisées"
      );
    }

    // Compter les inscriptions confirmées (pas seulement les joueurs dans la relation)
    const confirmedRegistrations = await this.registrationRepository.count({
      where: {
        tournament: { id: tournamentId },
        status: RegistrationStatus.CONFIRMED
      }
    });

    if (
      tournament.maxPlayers &&
      confirmedRegistrations >= tournament.maxPlayers
    ) {
      throw new BadRequestException('Le tournoi est complet');
    }

    // Vérifier si le joueur n'est pas déjà inscrit
    const existingRegistration = await this.registrationRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } }
    });

    if (existingRegistration) {
      if (existingRegistration.status === RegistrationStatus.CANCELLED) {
        // Réactiver l'inscription annulée
        existingRegistration.status = tournament.requiresApproval
          ? RegistrationStatus.PENDING
          : RegistrationStatus.CONFIRMED;
        existingRegistration.notes = notes ?? ''; // Ensure notes is never undefined
        existingRegistration.registeredAt = new Date();
        return this.registrationRepository.save(existingRegistration);
      } else {
        throw new ConflictException('Le joueur est déjà inscrit à ce tournoi');
      }
    }

    // Déterminer le statut selon les règles
    let registrationStatus = RegistrationStatus.CONFIRMED;
    if (tournament.requiresApproval) {
      registrationStatus = RegistrationStatus.PENDING;
    } else if (isLateRegistration && tournament.allowLateRegistration) {
      registrationStatus = RegistrationStatus.PENDING; // Inscription tardive en attente
    }

    const registration = this.registrationRepository.create({
      tournament,
      player,
      notes,
      registeredAt: new Date(),
      status: registrationStatus
    });

    return this.registrationRepository.save(registration);
  }

  // Désinscrire un joueur d'un tournoi
  async unregisterPlayer(
    tournamentId: number,
    playerId: number
  ): Promise<void> {
    const tournament = await this.findOne(tournamentId);

    if (
      tournament.status === TournamentStatus.IN_PROGRESS ||
      tournament.status === TournamentStatus.FINISHED
    ) {
      throw new BadRequestException(
        "Impossible de se désinscrire d'un tournoi en cours ou terminé"
      );
    }

    const registration = await this.registrationRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } }
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException('Cette inscription est déjà annulée');
    }

    registration.status = RegistrationStatus.CANCELLED;
    await this.registrationRepository.save(registration);
  }

  // Récupérer les tournois d'un joueur
  async getPlayerTournaments(playerId: number): Promise<Tournament[]> {
    return this.tournamentRepository
      .createQueryBuilder('tournament')
      .leftJoin('tournament.players', 'player')
      .where('player.id = :playerId', { playerId })
      .getMany();
  }

  // Récupérer les tournois à venir
  async getUpcomingTournaments(limit: number = 10): Promise<Tournament[]> {
    return this.tournamentRepository.find({
      where: {
        startDate: new Date(),
        isPublic: true,
        status: In([
          TournamentStatus.REGISTRATION_OPEN,
          TournamentStatus.REGISTRATION_CLOSED
        ])
      },
      order: { startDate: 'ASC' },
      take: limit,
      relations: ['pricing', 'rewards']
    });
  }

  // Récupérer les statistiques d'un tournoi
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
            (reg) => reg.status === RegistrationStatus.CONFIRMED
          ).length || 0,
        pending:
          tournament.registrations?.filter(
            (reg) => reg.status === RegistrationStatus.PENDING
          ).length || 0,
        cancelled:
          tournament.registrations?.filter(
            (reg) => reg.status === RegistrationStatus.CANCELLED
          ).length || 0
      }
    };

    return stats;
  }

  private getValidStatusTransitions(
    currentStatus: TournamentStatus
  ): TournamentStatus[] {
    const transitions = {
      [TournamentStatus.DRAFT]: [
        TournamentStatus.REGISTRATION_OPEN,
        TournamentStatus.CANCELLED
      ],
      [TournamentStatus.REGISTRATION_OPEN]: [
        TournamentStatus.REGISTRATION_CLOSED,
        TournamentStatus.CANCELLED
      ],
      [TournamentStatus.REGISTRATION_CLOSED]: [
        TournamentStatus.IN_PROGRESS,
        TournamentStatus.CANCELLED
      ],
      [TournamentStatus.IN_PROGRESS]: [
        TournamentStatus.FINISHED,
        TournamentStatus.CANCELLED
      ],
      [TournamentStatus.FINISHED]: [],
      [TournamentStatus.CANCELLED]: []
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Démarre un tournoi
   */
  async startTournament(
    tournamentId: number,
    options?: { seedingMethod?: string; checkInRequired?: boolean }
  ) {
    const seedingMethod =
      (options?.seedingMethod as SeedingMethod) || SeedingMethod.RANDOM;
    return this.orchestrationService.startTournament(tournamentId, {
      seedingMethod,
      checkInRequired: options?.checkInRequired
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

    if (tournament.type === TournamentType.SWISS_SYSTEM) {
      return this.bracketService.generateSwissPairings(
        tournamentId,
        targetRound
      );
    } else {
      return this.matchService.getMatchesByRound(tournamentId, targetRound);
    }
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
    filters?: { round?: number; status?: string }
  ) {
    return this.matchService.findAll({
      tournamentId,
      round: filters?.round,
      status: filters?.status as MatchStatus
    });
  }

  /**
   * Récupère un match spécifique d'un tournoi
   */
  async getTournamentMatch(tournamentId: number, matchId: number) {
    const match = await this.matchService.findOne(matchId);

    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    if (match.tournament?.id !== tournamentId) {
      throw new NotFoundException('Match non trouvé dans ce tournoi');
    }

    return match;
  }

  /**
   * Récupère les inscriptions d'un tournoi
   */
  async getTournamentRegistrations(tournamentId: number, status?: string) {
    const queryBuilder = this.registrationRepository
      .createQueryBuilder('registration')
      .leftJoinAndSelect('registration.player', 'player')
      .leftJoinAndSelect('registration.payments', 'payments')
      .where('registration.tournament.id = :tournamentId', { tournamentId });

    if (status) {
      queryBuilder.andWhere('registration.status = :status', { status });
    }

    return queryBuilder.orderBy('registration.registeredAt', 'ASC').getMany();
  }

  /**
   * Confirme une inscription
   */
  async confirmRegistration(tournamentId: number, registrationId: number) {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, tournament: { id: tournamentId } },
      relations: ['tournament', 'player']
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    if (registration.status === RegistrationStatus.CONFIRMED) {
      throw new BadRequestException('Cette inscription est déjà confirmée');
    }

    const confirmedCount = await this.registrationRepository.count({
      where: {
        tournament: { id: tournamentId },
        status: RegistrationStatus.CONFIRMED
      }
    });

    if (
      registration.tournament.maxPlayers &&
      confirmedCount >= registration.tournament.maxPlayers
    ) {
      throw new BadRequestException('Le tournoi est complet');
    }

    registration.status = RegistrationStatus.CONFIRMED;
    return this.registrationRepository.save(registration);
  }

  /**
   * Annule une inscription
   */
  async cancelRegistration(
    tournamentId: number,
    registrationId: number,
    reason?: string
  ) {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, tournament: { id: tournamentId } }
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    registration.status = RegistrationStatus.CANCELLED;
    if (reason) {
      registration.notes = `Annulée: ${reason}`;
    }

    return this.registrationRepository.save(registration);
  }

  /**
   * Check-in d'un joueur
   */
  async checkInPlayer(
    tournamentId: number,
    registrationId: number,
    userId: number
  ) {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId, tournament: { id: tournamentId } },
      relations: ['player', 'player.user']
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    // Vérifier que l'utilisateur peut faire le check-in
    if (registration.player.user?.id !== userId) {
      throw new BadRequestException(
        'Vous ne pouvez faire le check-in que pour votre propre inscription'
      );
    }

    if (registration.status !== RegistrationStatus.CONFIRMED) {
      throw new BadRequestException(
        "L'inscription doit être confirmée pour faire le check-in"
      );
    }

    if (registration.checkedIn) {
      throw new BadRequestException('Check-in déjà effectué');
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();

    return this.registrationRepository.save(registration);
  }
}
