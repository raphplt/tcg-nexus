import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Match, MatchStatus, MatchPhase } from './entities/match.entity';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../tournament/entities/tournament-registration.entity';
import { Ranking } from '../ranking/entities/ranking.entity';
import { Statistics } from '../statistics/entities/statistic.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole } from 'src/common/enums/user';

describe('MatchService', () => {
  let service: MatchService;

  const mockMatchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn()
  };

  const mockTournamentRepository = {
    findOne: jest.fn(),
    save: jest.fn()
  };

  const mockPlayerRepository = {
    findOne: jest.fn()
  };

  const mockRegistrationRepository = {
    findOne: jest.fn()
  };

  const mockRankingRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };

  const mockStatisticsRepository = {
    create: jest.fn(),
    save: jest.fn()
  };

  const mockDataSource = {
    transaction: jest.fn()
  };

  const mockUser: any = {
    id: 1,
    role: UserRole.USER
  };

  const mockPlayerA: Player = {
    id: 1,
    user: mockUser, // Name is derived from User
    tournaments: [],
    statistics: [],
    rankings: []
  };

  const mockPlayerB: Player = { ...mockPlayerA, id: 2 };

  const mockTournament: Tournament = {
    id: 1,
    name: 'Tournament 1',
    status: TournamentStatus.IN_PROGRESS,
    type: TournamentType.SINGLE_ELIMINATION,
    currentRound: 1,
    matches: [],
    registrations: [],
    organizers: [],
    rankings: [],
    rewards: [],
    pricing: {} as any,
    startDate: new Date(),
    endDate: new Date(),
    location: '',
    description: '',
    rules: '',
    // Corrected property name
    maxPlayers: 16,
    additionalInfo: '',
    allowedFormats: [],
    ageRestrictionMin: 0,
    ageRestrictionMax: 0,
    requiresApproval: false,
    allowLateRegistration: true, // properties from entity
    isPublic: true,
    isFinished: false,
    players: [], // Add missing property
    createdAt: new Date(),
    updatedAt: new Date(),
    notifications: []
  };

  const mockMatch: Match = {
    id: 1,
    tournament: mockTournament,
    playerA: mockPlayerA,
    playerB: mockPlayerB,
    playerAScore: 0,
    playerBScore: 0,
    round: 1,
    phase: MatchPhase.QUALIFICATION,
    status: MatchStatus.SCHEDULED,
    scheduledDate: new Date(),
    startedAt: undefined,
    finishedAt: undefined,
    notes: 'Match 1',
    statistics: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: getRepositoryToken(Match), useValue: mockMatchRepository },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepository
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepository },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: mockRegistrationRepository
        },
        {
          provide: getRepositoryToken(Ranking),
          useValue: mockRankingRepository
        },
        {
          provide: getRepositoryToken(Statistics),
          useValue: mockStatisticsRepository
        },
        { provide: DataSource, useValue: mockDataSource }
      ]
    }).compile();

    service = module.get<MatchService>(MatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      tournamentId: 1,
      playerAId: 1,
      playerBId: 2,
      round: 1,
      phase: MatchPhase.QUALIFICATION,
      scheduledDate: new Date(),
      notes: 'Test Match'
    };

    it('should create a match successfully', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne
        .mockResolvedValueOnce(mockPlayerA)
        .mockResolvedValueOnce(mockPlayerB);
      mockRegistrationRepository.findOne.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED
      });
      mockMatchRepository.create.mockReturnValue(mockMatch);
      mockMatchRepository.save.mockResolvedValue(mockMatch);

      const result = await service.create(createDto);

      expect(result).toEqual(mockMatch);
      expect(mockMatchRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tournament not found', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if tournament not in progress', async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.DRAFT
      });
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    it('should update match scores', async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update(1, {
        playerAScore: 2,
        playerBScore: 1
      });

      expect(result.playerAScore).toBe(2);
      expect(mockMatchRepository.save).toHaveBeenCalled();
    });

    it('should set winner when status is finished', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        playerAScore: 2,
        playerBScore: 1
      });
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      // Must provide scores to trigger finish logic in current implementation
      const result = await service.update(1, {
        status: MatchStatus.FINISHED,
        playerAScore: 2,
        playerBScore: 1
      });

      expect(result.status).toBe(MatchStatus.FINISHED);
      expect(result.winner).toEqual(mockPlayerA);
    });
  });

  describe('reportScore', () => {
    it('should process score reporting transactionally', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS
      });

      // Basic transaction mock that executes the callback
      mockDataSource.transaction.mockImplementation(
        async (cb: (manager: any) => Promise<unknown>) => {
          // Mock manager for transaction
          const manager = {
            save: jest
              .fn()
              .mockImplementation((entity, data) =>
                Promise.resolve(data || entity)
              ),
            findOne: jest.fn().mockResolvedValue(mockTournament), // for tournament check
            create: jest.fn().mockReturnValue({})
          };
          return cb(manager);
        }
      );

      const reportDto = { playerAScore: 2, playerBScore: 0, isForfeit: false };
      await service.reportScore(1, reportDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return matches with pagination and filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockMatch], 1])
      };

      mockMatchRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        tournamentId: 1
      });

      expect(result.matches).toEqual([mockMatch]);
      expect(result.total).toBe(1);
      expect(mockMatchRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a match by id', async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);

      const result = await service.findOne(1);
      expect(result).toEqual(mockMatch);
    });

    it('should throw NotFoundException if match not found', async () => {
      mockMatchRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a scheduled match', async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockMatchRepository.remove.mockResolvedValue(mockMatch);

      await service.remove(1);
      expect(mockMatchRepository.remove).toHaveBeenCalledWith(mockMatch);
    });

    it('should throw BadRequestException if match is in progress', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS
      });

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('startMatch', () => {
    it('should start a scheduled match', async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.startMatch(1, { notes: 'Starting' });

      expect(result.status).toBe(MatchStatus.IN_PROGRESS);
      expect(result.startedAt).toBeDefined();
    });

    it('should throw BadRequestException if match not scheduled', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.FINISHED
      });

      await expect(service.startMatch(1, {})).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('resetMatch', () => {
    it('should reset a finished match transactionally', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.FINISHED
      });

      mockDataSource.transaction.mockImplementation(
        async (cb: (manager: any) => Promise<unknown>) => {
          const manager = {
            save: jest
              .fn()
              .mockImplementation((entity, data) =>
                Promise.resolve(data || entity)
              ),
            delete: jest.fn().mockResolvedValue({})
          };
          return cb(manager);
        }
      );

      await service.resetMatch(1, { reason: 'Mistake' });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if match is not finished', async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.SCHEDULED
      });

      await expect(service.resetMatch(1, {})).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
