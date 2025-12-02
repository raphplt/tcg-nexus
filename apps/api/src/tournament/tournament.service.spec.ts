import { Test, TestingModule } from '@nestjs/testing';
import { TournamentService } from './tournament.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from './entities/tournament.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from './entities/tournament-registration.entity';
import { TournamentOrganizer } from './entities/tournament-organizer.entity';
import { Player } from '../player/entities/player.entity';
import { User } from '../user/entities/user.entity';
import { BracketService } from './services/bracket.service';
import { SeedingService } from './services/seeding.service';
import { TournamentOrchestrationService } from './services/tournament-orchestration.service';
import { TournamentStateService } from './services/tournament-state.service';
import { RankingService } from '../ranking/ranking.service';
import { MatchService } from '../match/match.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';

describe('TournamentService', () => {
  let service: TournamentService;
  let tournamentRepo: any;
  let registrationRepo: any;
  let organizerRepo: any;
  let playerRepo: any;
  let userRepo: any;
  let stateService: any;

  const mockTournamentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getMany: jest.fn().mockResolvedValue([])
    }))
  };

  const mockRegistrationRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([])
    }))
  };

  const mockOrganizerRepo = {
    create: jest.fn(),
    save: jest.fn()
  };

  const mockPlayerRepo = {
    findOne: jest.fn()
  };

  const mockUserRepo = {
    findOne: jest.fn()
  };

  const mockStateService = {
    transitionState: jest.fn(),
    validateStateTransition: jest.fn(),
    getStateHistory: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepo
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: mockRegistrationRepo
        },
        {
          provide: getRepositoryToken(TournamentOrganizer),
          useValue: mockOrganizerRepo
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: BracketService, useValue: {} },
        { provide: SeedingService, useValue: {} },
        {
          provide: TournamentOrchestrationService,
          useValue: {
            startTournament: jest.fn(),
            finishTournament: jest.fn(),
            cancelTournament: jest.fn(),
            advanceToNextRound: jest.fn(),
            getTournamentProgress: jest.fn()
          }
        },
        { provide: TournamentStateService, useValue: mockStateService },
        {
          provide: RankingService,
          useValue: { getTournamentRankings: jest.fn() }
        },
        {
          provide: MatchService,
          useValue: {
            getMatchesByRound: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<TournamentService>(TournamentService);
    tournamentRepo = module.get(getRepositoryToken(Tournament));
    registrationRepo = module.get(getRepositoryToken(TournamentRegistration));
    organizerRepo = module.get(getRepositoryToken(TournamentOrganizer));
    playerRepo = module.get(getRepositoryToken(Player));
    userRepo = module.get(getRepositoryToken(User));
    stateService = module.get(TournamentStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateTournamentDto = {
      name: 'Test Tournament',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      type: TournamentType.SINGLE_ELIMINATION,

      minPlayers: 4,
      maxPlayers: 8
    };
    const userId = 1;

    it('should create a tournament successfully', async () => {
      tournamentRepo.create.mockReturnValue(dto);
      tournamentRepo.save.mockResolvedValue({ id: 1, ...dto });
      userRepo.findOne.mockResolvedValue({
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
      organizerRepo.create.mockReturnValue({});
      organizerRepo.save.mockResolvedValue({});

      const result = await service.create(dto, userId);

      expect(result).toEqual({ id: 1, ...dto });
      expect(tournamentRepo.save).toHaveBeenCalled();
      expect(organizerRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if startDate >= endDate', async () => {
      const invalidDto = {
        ...dto,
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-01')
      };
      tournamentRepo.create.mockReturnValue(invalidDto);

      await expect(service.create(invalidDto, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if minPlayers > maxPlayers', async () => {
      const invalidDto = { ...dto, minPlayers: 10, maxPlayers: 5 };
      tournamentRepo.create.mockReturnValue(invalidDto);

      await expect(service.create(invalidDto, userId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('registerPlayer', () => {
    const tournamentId = 1;
    const playerId = 1;
    const dto = { tournamentId, playerId };

    it('should register a player successfully', async () => {
      const tournament = {
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN,
        maxPlayers: 10
      };
      const player = { id: playerId };

      tournamentRepo.findOne.mockResolvedValue(tournament);
      playerRepo.findOne.mockResolvedValue(player);
      registrationRepo.count.mockResolvedValue(0);
      registrationRepo.findOne.mockResolvedValue(null);
      registrationRepo.create.mockReturnValue({});
      registrationRepo.save.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED
      });

      const result = await service.registerPlayer(dto);

      expect(result.status).toBe(RegistrationStatus.CONFIRMED);
      expect(registrationRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if registration is not open', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: tournamentId,
        status: TournamentStatus.DRAFT
      });
      playerRepo.findOne.mockResolvedValue({ id: playerId });

      await expect(service.registerPlayer(dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if tournament is full', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN,
        maxPlayers: 10
      });
      playerRepo.findOne.mockResolvedValue({ id: playerId });
      registrationRepo.count.mockResolvedValue(10);

      await expect(service.registerPlayer(dto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ConflictException if player already registered', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN
      });
      playerRepo.findOne.mockResolvedValue({ id: playerId });
      registrationRepo.count.mockResolvedValue(0);
      registrationRepo.findOne.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED
      });

      await expect(service.registerPlayer(dto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('unregisterPlayer', () => {
    it('should unregister a player', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN
      });
      registrationRepo.findOne.mockResolvedValue({
        id: 1,
        status: RegistrationStatus.CONFIRMED
      });
      registrationRepo.save.mockResolvedValue({});

      await service.unregisterPlayer(1, 1);

      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RegistrationStatus.CANCELLED })
      );
    });

    it('should throw BadRequestException if tournament in progress', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.IN_PROGRESS
      });

      await expect(service.unregisterPlayer(1, 1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('updateStatus', () => {
    it('should delegate to stateService', async () => {
      const status = TournamentStatus.REGISTRATION_OPEN;
      await service.updateStatus(1, { status });
      expect(stateService.transitionState).toHaveBeenCalledWith(1, status);
    });
  });
});
