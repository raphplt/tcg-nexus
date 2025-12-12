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
import {
  BadRequestException,
  ConflictException,
  NotFoundException
} from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { PaginationHelper } from '../helpers/pagination';
import { SeedingMethod } from './services/seeding.service';
import { UserRole } from '../common/enums/user';

describe('TournamentService', () => {
  let service: TournamentService;
  let tournamentRepo: any;
  let registrationRepo: any;
  let organizerRepo: any;
  let playerRepo: any;
  let userRepo: any;
  let stateService: any;
  let bracketService: any;
  let orchestrationService: any;
  let rankingService: any;
  let matchService: any;

  const mockTournamentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
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
    find: jest.fn(),
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
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([])
    }))
  };

  const mockUserRepo = {
    findOne: jest.fn()
  };

  const mockStateService = {
    transitionState: jest.fn(),
    validateStateTransition: jest.fn(),
    getStateHistory: jest.fn()
  };

  const mockBracketService = {
    getBracket: jest.fn(),
    generateSwissPairings: jest.fn()
  };

  const mockOrchestrationService = {
    startTournament: jest.fn(),
    finishTournament: jest.fn(),
    cancelTournament: jest.fn(),
    advanceToNextRound: jest.fn(),
    getTournamentProgress: jest.fn()
  };

  const mockRankingService = {
    getTournamentRankings: jest.fn()
  };

  const mockMatchService = {
    getMatchesByRound: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn()
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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
        { provide: BracketService, useValue: mockBracketService },
        { provide: SeedingService, useValue: {} },
        {
          provide: TournamentOrchestrationService,
          useValue: mockOrchestrationService
        },
        { provide: TournamentStateService, useValue: mockStateService },
        {
          provide: RankingService,
          useValue: mockRankingService
        },
        {
          provide: MatchService,
          useValue: mockMatchService
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
    bracketService = module.get(BracketService);
    orchestrationService = module.get(TournamentOrchestrationService);
    rankingService = module.get(RankingService);
    matchService = module.get(MatchService);
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

    it('should throw BadRequestException if registrationDeadline >= startDate', async () => {
      const invalidDto = {
        ...dto,
        registrationDeadline: new Date('2024-01-01')
      };
      tournamentRepo.create.mockReturnValue(invalidDto);

      await expect(service.create(invalidDto, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      tournamentRepo.create.mockReturnValue(dto);
      tournamentRepo.save.mockResolvedValue({ id: 1, ...dto });
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, userId)).rejects.toThrow(
        NotFoundException
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

    it('should throw NotFoundException if player not found', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN
      });
      playerRepo.findOne.mockResolvedValue(null);

      await expect(service.registerPlayer(dto)).rejects.toThrow(
        NotFoundException
      );
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

    it('should reactivate a cancelled registration', async () => {
      const tournament = {
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN,
        requiresApproval: false
      };

      tournamentRepo.findOne.mockResolvedValue(tournament);
      playerRepo.findOne.mockResolvedValue({ id: playerId });
      registrationRepo.count.mockResolvedValue(0);
      const existing = {
        status: RegistrationStatus.CANCELLED,
        notes: undefined,
        registeredAt: null
      };
      registrationRepo.findOne.mockResolvedValue(existing);
      registrationRepo.save.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED,
        notes: ''
      });

      const result = await service.registerPlayer({
        tournamentId,
        playerId,
        notes: undefined
      } as any);

      expect(result.status).toBe(RegistrationStatus.CONFIRMED);
      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RegistrationStatus.CONFIRMED })
      );
    });

    it('should set PENDING when approval is required', async () => {
      const tournament = {
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN,
        requiresApproval: true
      };
      tournamentRepo.findOne.mockResolvedValue(tournament);
      playerRepo.findOne.mockResolvedValue({ id: playerId });
      registrationRepo.count.mockResolvedValue(0);
      registrationRepo.findOne.mockResolvedValue(null);
      registrationRepo.create.mockReturnValue({});
      registrationRepo.save.mockResolvedValue({
        status: RegistrationStatus.PENDING
      });

      const result = await service.registerPlayer(dto as any);
      expect(result.status).toBe(RegistrationStatus.PENDING);
    });

    it('should reject late registration when not allowed', async () => {
      const tournament = {
        id: tournamentId,
        status: TournamentStatus.REGISTRATION_OPEN,
        allowLateRegistration: false,
        registrationDeadline: new Date(Date.now() - 60_000)
      };
      tournamentRepo.findOne.mockResolvedValue(tournament);
      playerRepo.findOne.mockResolvedValue({ id: playerId });
      registrationRepo.count.mockResolvedValue(0);
      registrationRepo.findOne.mockResolvedValue(null);

      await expect(service.registerPlayer(dto as any)).rejects.toThrow(
        BadRequestException
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

    it('should throw NotFoundException if registration not found', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN
      });
      registrationRepo.findOne.mockResolvedValue(null);

      await expect(service.unregisterPlayer(1, 1)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if already cancelled', async () => {
      tournamentRepo.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN
      });
      registrationRepo.findOne.mockResolvedValue({
        id: 1,
        status: RegistrationStatus.CANCELLED
      });

      await expect(service.unregisterPlayer(1, 1)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when tournament not found', async () => {
      tournamentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('should return tournament when found', async () => {
      tournamentRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.findOne(1)).resolves.toEqual({ id: 1 });
    });
  });

  describe('findAll', () => {
    it('should delegate to PaginationHelper.paginateQueryBuilder', async () => {
      const spy = jest
        .spyOn(PaginationHelper, 'paginateQueryBuilder')
        .mockResolvedValue({
          data: [],
          meta: {
            totalItems: 0,
            itemCount: 0,
            itemsPerPage: 10,
            totalPages: 0,
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });

      const result = await service.findAll({ page: 1, limit: 10 } as any);
      expect(result.data).toEqual([]);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('update', () => {
    it('should reject update if tournament is IN_PROGRESS', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: TournamentStatus.IN_PROGRESS
      } as any);

      await expect(service.update(1, { name: 'x' } as any)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject update if dates are invalid', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: TournamentStatus.DRAFT
      } as any);

      await expect(
        service.update(1, {
          startDate: new Date('2024-01-02'),
          endDate: new Date('2024-01-01')
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should save updated tournament', async () => {
      const tournament = { id: 1, status: TournamentStatus.DRAFT, name: 'a' };
      jest.spyOn(service, 'findOne').mockResolvedValue(tournament as any);
      tournamentRepo.save.mockResolvedValue({ ...tournament, name: 'b' });

      const result = await service.update(1, { name: 'b' } as any);
      expect(result.name).toBe('b');
      expect(tournamentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'b' })
      );
    });
  });

  describe('remove', () => {
    it('should reject remove for non-admin when not DRAFT', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN
      } as any);

      await expect(
        service.remove(1, { id: 1, role: UserRole.USER } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove when admin', async () => {
      const t = { id: 1, status: TournamentStatus.REGISTRATION_OPEN };
      jest.spyOn(service, 'findOne').mockResolvedValue(t as any);
      tournamentRepo.remove.mockResolvedValue(undefined);

      await service.remove(1, { id: 1, role: UserRole.ADMIN } as any);
      expect(tournamentRepo.remove).toHaveBeenCalledWith(t);
    });

    it('should remove when DRAFT', async () => {
      const t = { id: 1, status: TournamentStatus.DRAFT };
      jest.spyOn(service, 'findOne').mockResolvedValue(t as any);
      tournamentRepo.remove.mockResolvedValue(undefined);

      await service.remove(1, { id: 1, role: UserRole.USER } as any);
      expect(tournamentRepo.remove).toHaveBeenCalledWith(t);
    });
  });

  describe('updateStatus', () => {
    it('should delegate to stateService', async () => {
      const status = TournamentStatus.REGISTRATION_OPEN;
      await service.updateStatus(1, { status });
      expect(stateService.transitionState).toHaveBeenCalledWith(1, status);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should delegate to stateService.getStateHistory', async () => {
      mockStateService.getStateHistory.mockResolvedValue([
        { from: 'a', to: 'b' }
      ]);
      const result = await service.getAvailableTransitions(1);
      expect(result).toEqual([{ from: 'a', to: 'b' }]);
      expect(stateService.getStateHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('validateStateTransition', () => {
    it('should delegate to stateService.validateStateTransition', async () => {
      mockStateService.validateStateTransition.mockResolvedValue({
        valid: true
      });
      const result = await service.validateStateTransition(
        1,
        TournamentStatus.IN_PROGRESS
      );
      expect(result).toEqual({ valid: true });
      expect(stateService.validateStateTransition).toHaveBeenCalledWith(
        1,
        TournamentStatus.IN_PROGRESS
      );
    });
  });

  describe('startTournament / finish / cancel / advance', () => {
    it('should default seedingMethod to RANDOM', async () => {
      orchestrationService.startTournament.mockResolvedValue({ ok: true });
      await service.startTournament(1);
      expect(orchestrationService.startTournament).toHaveBeenCalledWith(1, {
        seedingMethod: SeedingMethod.RANDOM,
        checkInRequired: undefined
      });
    });

    it('should pass seedingMethod and checkInRequired', async () => {
      orchestrationService.startTournament.mockResolvedValue({ ok: true });
      await service.startTournament(1, {
        seedingMethod: SeedingMethod.ELO,
        checkInRequired: true
      });
      expect(orchestrationService.startTournament).toHaveBeenCalledWith(1, {
        seedingMethod: SeedingMethod.ELO,
        checkInRequired: true
      });
    });

    it('should delegate finishTournament', async () => {
      orchestrationService.finishTournament.mockResolvedValue({
        status: 'FINISHED'
      });
      const result = await service.finishTournament(1);
      expect(result).toEqual({ status: 'FINISHED' });
      expect(orchestrationService.finishTournament).toHaveBeenCalledWith(1);
    });

    it('should delegate cancelTournament with reason', async () => {
      orchestrationService.cancelTournament.mockResolvedValue({
        status: 'CANCELLED'
      });
      const result = await service.cancelTournament(1, 'x');
      expect(result).toEqual({ status: 'CANCELLED' });
      expect(orchestrationService.cancelTournament).toHaveBeenCalledWith(
        1,
        'x'
      );
    });

    it('should delegate advanceToNextRound', async () => {
      orchestrationService.advanceToNextRound.mockResolvedValue({
        currentRound: 2
      });
      const result = await service.advanceToNextRound(1);
      expect(result).toEqual({ currentRound: 2 });
      expect(orchestrationService.advanceToNextRound).toHaveBeenCalledWith(1);
    });
  });

  describe('getBracket', () => {
    it('should delegate to bracketService', async () => {
      bracketService.getBracket.mockResolvedValue({ rounds: [] });
      const result = await service.getBracket(1);
      expect(result).toEqual({ rounds: [] });
      expect(bracketService.getBracket).toHaveBeenCalledWith(1);
    });
  });

  describe('getCurrentPairings', () => {
    it('should generate swiss pairings when SWISS_SYSTEM', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        type: TournamentType.SWISS_SYSTEM,
        currentRound: 2
      } as any);
      bracketService.generateSwissPairings.mockResolvedValue([{ id: 'p' }]);

      const result = await service.getCurrentPairings(1);

      expect(result).toEqual([{ id: 'p' }]);
      expect(bracketService.generateSwissPairings).toHaveBeenCalledWith(1, 2);
    });

    it('should use matchService.getMatchesByRound for non-swiss', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        currentRound: 1
      } as any);
      matchService.getMatchesByRound.mockResolvedValue([{ id: 'm' }]);

      const result = await service.getCurrentPairings(1, 3);
      expect(result).toEqual([{ id: 'm' }]);
      expect(matchService.getMatchesByRound).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('getTournamentRankings / progress', () => {
    it('should delegate getTournamentRankings', async () => {
      rankingService.getTournamentRankings.mockResolvedValue([{ rank: 1 }]);
      const result = await service.getTournamentRankings(1);
      expect(result).toEqual([{ rank: 1 }]);
      expect(rankingService.getTournamentRankings).toHaveBeenCalledWith(1);
    });

    it('should delegate getTournamentProgress', async () => {
      orchestrationService.getTournamentProgress.mockResolvedValue({
        status: 'IN_PROGRESS'
      });
      const result = await service.getTournamentProgress(1);
      expect(result).toEqual({ status: 'IN_PROGRESS' });
      expect(orchestrationService.getTournamentProgress).toHaveBeenCalledWith(
        1
      );
    });
  });

  describe('getTournamentMatches', () => {
    it('should delegate to matchService.findAll', async () => {
      matchService.findAll.mockResolvedValue([{ id: 1 }]);
      const result = await service.getTournamentMatches(1, {
        round: 2,
        status: 'FINISHED'
      });
      expect(result).toEqual([{ id: 1 }]);
      expect(matchService.findAll).toHaveBeenCalledWith({
        tournamentId: 1,
        round: 2,
        status: 'FINISHED'
      });
    });
  });

  describe('getTournamentMatch / updateTournamentMatch', () => {
    it('should throw NotFoundException if match not found', async () => {
      matchService.findOne.mockResolvedValue(null);
      await expect(service.getTournamentMatch(1, 10)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if match belongs to another tournament', async () => {
      matchService.findOne.mockResolvedValue({ id: 10, tournament: { id: 2 } });
      await expect(service.getTournamentMatch(1, 10)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return match when tournament matches', async () => {
      matchService.findOne.mockResolvedValue({ id: 10, tournament: { id: 1 } });
      await expect(service.getTournamentMatch(1, 10)).resolves.toEqual({
        id: 10,
        tournament: { id: 1 }
      });
    });

    it('should update match after validating tournament ownership', async () => {
      jest
        .spyOn(service, 'getTournamentMatch')
        .mockResolvedValue({ id: 10, tournament: { id: 1 } } as any);
      matchService.update.mockResolvedValue({ id: 10, status: 'FINISHED' });

      const result = await service.updateTournamentMatch(1, 10, {
        playerAScore: 1
      });

      expect(result).toEqual({ id: 10, status: 'FINISHED' });
      expect(matchService.update).toHaveBeenCalledWith(10, {
        playerAScore: 1
      });
    });
  });

  describe('getTournamentRegistrations', () => {
    it('should return registrations without status filter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1 }])
      };
      registrationRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTournamentRegistrations(1);

      expect(result).toEqual([{ id: 1 }]);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should apply status filter', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1 }])
      };
      registrationRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getTournamentRegistrations(1, 'CONFIRMED');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'registration.status = :status',
        {
          status: 'CONFIRMED'
        }
      );
    });
  });

  describe('confirmRegistration', () => {
    it('should throw NotFoundException if registration missing', async () => {
      registrationRepo.findOne.mockResolvedValue(null);
      await expect(service.confirmRegistration(1, 2)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException if already confirmed', async () => {
      registrationRepo.findOne.mockResolvedValue({
        id: 2,
        status: RegistrationStatus.CONFIRMED,
        tournament: { id: 1 }
      });
      await expect(service.confirmRegistration(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if tournament full', async () => {
      registrationRepo.findOne.mockResolvedValue({
        id: 2,
        status: RegistrationStatus.PENDING,
        tournament: { id: 1, maxPlayers: 1 }
      });
      registrationRepo.count.mockResolvedValue(1);
      await expect(service.confirmRegistration(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should confirm and save', async () => {
      const reg = {
        id: 2,
        status: RegistrationStatus.PENDING,
        tournament: { id: 1, maxPlayers: 10 }
      };
      registrationRepo.findOne.mockResolvedValue(reg);
      registrationRepo.count.mockResolvedValue(0);
      registrationRepo.save.mockResolvedValue({
        ...reg,
        status: RegistrationStatus.CONFIRMED
      });

      const result = await service.confirmRegistration(1, 2);
      expect(result.status).toBe(RegistrationStatus.CONFIRMED);
      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RegistrationStatus.CONFIRMED })
      );
    });
  });

  describe('cancelRegistration', () => {
    it('should throw NotFoundException if registration missing', async () => {
      registrationRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelRegistration(1, 2)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should cancel and keep notes when no reason', async () => {
      const reg = { id: 2, status: RegistrationStatus.PENDING, notes: '' };
      registrationRepo.findOne.mockResolvedValue(reg);
      registrationRepo.save.mockResolvedValue({
        ...reg,
        status: RegistrationStatus.CANCELLED
      });
      const result = await service.cancelRegistration(1, 2);
      expect(result.status).toBe(RegistrationStatus.CANCELLED);
    });

    it('should set notes when reason provided', async () => {
      const reg = { id: 2, status: RegistrationStatus.PENDING, notes: '' };
      registrationRepo.findOne.mockResolvedValue(reg);
      registrationRepo.save.mockResolvedValue({
        ...reg,
        status: RegistrationStatus.CANCELLED,
        notes: 'Annulée: test'
      });

      const result = await service.cancelRegistration(1, 2, 'test');
      expect(result.notes).toBe('Annulée: test');
      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RegistrationStatus.CANCELLED,
          notes: 'Annulée: test'
        })
      );
    });
  });

  describe('checkInPlayer', () => {
    it('should throw NotFoundException if registration missing', async () => {
      registrationRepo.findOne.mockResolvedValue(null);
      await expect(service.checkInPlayer(1, 2, 3)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should reject check-in for other user', async () => {
      registrationRepo.findOne.mockResolvedValue({
        id: 2,
        status: RegistrationStatus.CONFIRMED,
        checkedIn: false,
        player: { user: { id: 999 } }
      });
      await expect(service.checkInPlayer(1, 2, 3)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject check-in if not confirmed', async () => {
      registrationRepo.findOne.mockResolvedValue({
        id: 2,
        status: RegistrationStatus.PENDING,
        checkedIn: false,
        player: { user: { id: 3 } }
      });
      await expect(service.checkInPlayer(1, 2, 3)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject if already checked in', async () => {
      registrationRepo.findOne.mockResolvedValue({
        id: 2,
        status: RegistrationStatus.CONFIRMED,
        checkedIn: true,
        player: { user: { id: 3 } }
      });
      await expect(service.checkInPlayer(1, 2, 3)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should set checkedIn flags and save', async () => {
      const reg = {
        id: 2,
        status: RegistrationStatus.CONFIRMED,
        checkedIn: false,
        checkedInAt: null,
        player: { user: { id: 3 } }
      };
      registrationRepo.findOne.mockResolvedValue(reg);
      registrationRepo.save.mockResolvedValue({ ...reg, checkedIn: true });

      const result = await service.checkInPlayer(1, 2, 3);
      expect(result.checkedIn).toBe(true);
      expect(registrationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ checkedIn: true })
      );
    });
  });

  describe('fillWithRandomPlayers', () => {
    it('should reject when registration not open', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: TournamentStatus.DRAFT
      } as any);
      await expect(service.fillWithRandomPlayers(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject when no available players', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN,
        maxPlayers: 10
      } as any);
      registrationRepo.find.mockResolvedValue([]);

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      };
      playerRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.fillWithRandomPlayers(1, 2)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should create and auto check-in registrations within available slots', async () => {
      const tournament = {
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN,
        maxPlayers: 1
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(tournament as any);
      registrationRepo.find.mockResolvedValue([]);

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 10, user: { isActive: true } }])
      };
      playerRepo.createQueryBuilder.mockReturnValue(qb);

      registrationRepo.create.mockImplementation((x: any) => x);
      registrationRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.fillWithRandomPlayers(1, 8);

      expect(result.registeredCount).toBe(1);
      expect(registrationRepo.save).toHaveBeenCalledTimes(1);
      expect(result.registrations[0]).toEqual(
        expect.objectContaining({
          tournament,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true
        })
      );
    });

    it('should add NOT IN clause when there are existing players', async () => {
      const tournament = {
        id: 1,
        status: TournamentStatus.REGISTRATION_OPEN,
        maxPlayers: 10
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(tournament as any);
      registrationRepo.find.mockResolvedValue([{ player: { id: 123 } }]);

      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 10, user: { isActive: true } }])
      };
      playerRepo.createQueryBuilder.mockReturnValue(qb);
      registrationRepo.create.mockImplementation((x: any) => x);
      registrationRepo.save.mockImplementation(async (x: any) => x);

      await service.fillWithRandomPlayers(1, 1);
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  describe('checkInAllPlayers', () => {
    it('should check in all confirmed registrations', async () => {
      const regs = [
        { id: 1, checkedIn: false, checkedInAt: null },
        { id: 2, checkedIn: false, checkedInAt: null }
      ];
      registrationRepo.find.mockResolvedValue(regs);
      registrationRepo.save.mockImplementation(async (x: any) => x);

      const result = await service.checkInAllPlayers(1);
      expect(result.checkedInCount).toBe(2);
      expect(registrationRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTournamentStats', () => {
    it('should compute stats safely', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 1,
        players: [{}, {}],
        matches: [{ finishedAt: null }, { finishedAt: new Date() }],
        currentRound: 2,
        totalRounds: 3,
        registrations: [
          { status: RegistrationStatus.CONFIRMED },
          { status: RegistrationStatus.PENDING },
          { status: RegistrationStatus.CANCELLED }
        ]
      } as any);

      const stats = await service.getTournamentStats(1);
      expect(stats.totalPlayers).toBe(2);
      expect(stats.totalMatches).toBe(2);
      expect(stats.completedMatches).toBe(1);
      expect(stats.registrations.confirmed).toBe(1);
    });
  });

  describe('getUpcomingTournaments / getPastTournaments', () => {
    it('should call repository.find for upcoming', async () => {
      tournamentRepo.find.mockResolvedValue([{ id: 1 }]);
      const result = await service.getUpcomingTournaments(2);
      expect(result).toEqual([{ id: 1 }]);
      expect(tournamentRepo.find).toHaveBeenCalled();
    });

    it('should call repository.find for past', async () => {
      tournamentRepo.find.mockResolvedValue([{ id: 2 }]);
      const result = await service.getPastTournaments(2);
      expect(result).toEqual([{ id: 2 }]);
      expect(tournamentRepo.find).toHaveBeenCalled();
    });
  });
});
