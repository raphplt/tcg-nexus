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
import { Tournament, TournamentStatus } from './entities/tournament.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from './entities/tournament-registration.entity';
import { Player } from '../player/entities/player.entity';
import { PaginationHelper } from '../helpers/pagination';

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>
  ) {}

  // Créer un nouveau tournoi
  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    const tournament = this.tournamentRepository.create(createTournamentDto);
    console.log("Creating tournament with data:", tournament);
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

    return this.tournamentRepository.save(tournament);
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
    const tournament = await this.findOne(id);
    const { status } = updateStatusDto;

    // Validation des transitions de statut
    const validTransitions = this.getValidStatusTransitions(tournament.status);
    if (!validTransitions.includes(status)) {
      throw new BadRequestException(
        `Transition de statut invalide de ${tournament.status} vers ${status}`
      );
    }

    // Vérifications spécifiques par statut
    if (status === TournamentStatus.REGISTRATION_OPEN) {
      if (!tournament.registrationDeadline) {
        throw new BadRequestException(
          "Une date limite d'inscription doit être définie"
        );
      }
    }

    if (status === TournamentStatus.IN_PROGRESS) {
      const playerCount = tournament.players?.length || 0;
      if (tournament.minPlayers && playerCount < tournament.minPlayers) {
        throw new BadRequestException(
          `Pas assez de joueurs inscrits (${playerCount}/${tournament.minPlayers})`
        );
      }
    }

    tournament.status = status;
    return this.tournamentRepository.save(tournament);
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

    if (
      tournament.registrationDeadline &&
      new Date() > tournament.registrationDeadline
    ) {
      throw new BadRequestException(
        "La date limite d'inscription est dépassée"
      );
    }

    if (
      tournament.maxPlayers &&
      tournament.players.length >= tournament.maxPlayers
    ) {
      throw new BadRequestException('Le tournoi est complet');
    }

    // Vérifier si le joueur n'est pas déjà inscrit
    const existingRegistration = await this.registrationRepository.findOne({
      where: { tournament: { id: tournamentId }, player: { id: playerId } }
    });

    if (existingRegistration) {
      throw new ConflictException('Le joueur est déjà inscrit à ce tournoi');
    }

    const registration = this.registrationRepository.create({
      tournament,
      player,
      notes,
      registeredAt: new Date(),
      status: tournament.requiresApproval
        ? RegistrationStatus.PENDING
        : RegistrationStatus.CONFIRMED
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

    await this.registrationRepository.remove(registration);
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
}
