import { Test, TestingModule } from '@nestjs/testing';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentQueryDto } from './dto/tournament-query.dto';
import { User } from '../user/entities/user.entity';
import { TournamentStatus } from './entities/tournament.entity';
import { TournamentOrganizerGuard } from './guards/tournament-organizer.guard';
import { TournamentParticipantGuard } from './guards/tournament-participant.guard';
import { TournamentOwnerGuard } from './guards/tournament-owner.guard';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TournamentOrganizer } from './entities/tournament-organizer.entity';
import { Tournament } from './entities/tournament.entity';
import { TournamentRegistration } from './entities/tournament-registration.entity';
import { Player } from '../player/entities/player.entity';

describe('TournamentController', () => {
  let controller: TournamentController;
  let service: TournamentService;

  const mockTournamentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getUpcomingTournaments: jest.fn(),
    getPastTournaments: jest.fn(),
    findOne: jest.fn(),
    getTournamentStats: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    registerPlayer: jest.fn(),
    unregisterPlayer: jest.fn(),
    getPlayerTournaments: jest.fn(),
    remove: jest.fn(),
    startTournament: jest.fn(),
    finishTournament: jest.fn(),
    cancelTournament: jest.fn(),
    advanceToNextRound: jest.fn(),
    getBracket: jest.fn(),
    getCurrentPairings: jest.fn(),
    getTournamentRankings: jest.fn(),
    getTournamentProgress: jest.fn(),
    getAvailableTransitions: jest.fn(),
    validateStateTransition: jest.fn(),
    getTournamentMatches: jest.fn(),
    getTournamentMatch: jest.fn(),
    getTournamentRegistrations: jest.fn(),
    confirmRegistration: jest.fn(),
    cancelRegistration: jest.fn(),
    checkInPlayer: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentController],
      providers: [
        { provide: TournamentService, useValue: mockTournamentService },
        {
          provide: TournamentOrganizerGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) }
        },
        {
          provide: TournamentParticipantGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) }
        },
        {
          provide: TournamentOwnerGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) }
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() }
        },
        {
          provide: getRepositoryToken(TournamentOrganizer),
          useValue: {}
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: {}
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: {}
        },
        {
          provide: getRepositoryToken(Player),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<TournamentController>(TournamentController);
    service = module.get<TournamentService>(TournamentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tournament', async () => {
      const dto: CreateTournamentDto = {
        name: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        type: 'SINGLE_ELIMINATION' as any
      };
      const user = { id: 1 } as User;
      mockTournamentService.create.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.create(dto, user);

      expect(result).toEqual({ id: 1, ...dto });
      expect(service.create).toHaveBeenCalledWith(dto, user.id);
    });
  });

  describe('findAll', () => {
    it('should return all tournaments', async () => {
      const query: TournamentQueryDto = { page: 1, limit: 10 };
      mockTournamentService.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0 }
      });

      const result = await controller.findAll(query);

      expect(result).toEqual({ data: [], meta: { total: 0 } });
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a tournament', async () => {
      mockTournamentService.findOne.mockResolvedValue({ id: 1 });

      const result = await controller.findOne(1);

      expect(result).toEqual({ id: 1 });
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('registerPlayer', () => {
    it('should register a player', async () => {
      const dto = { playerId: 2 };
      const user = { id: 1, player: { id: 2 } } as User;
      mockTournamentService.registerPlayer.mockResolvedValue({
        status: 'CONFIRMED'
      });

      const result = await controller.registerPlayer(1, dto, user);

      expect(result).toEqual({ status: 'CONFIRMED' });
      expect(service.registerPlayer).toHaveBeenCalledWith({
        tournamentId: 1,
        playerId: 2
      });
    });

    it('should use user player id if not provided', async () => {
      const dto = {};
      const user = { id: 1, player: { id: 2 } } as User;
      mockTournamentService.registerPlayer.mockResolvedValue({
        status: 'CONFIRMED'
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.registerPlayer(1, dto as any, user);

      expect(service.registerPlayer).toHaveBeenCalledWith({
        tournamentId: 1,
        playerId: 2
      });
    });
  });

  describe('updateStatus', () => {
    it('should update status', async () => {
      const dto = { status: TournamentStatus.IN_PROGRESS };
      mockTournamentService.updateStatus.mockResolvedValue({
        id: 1,
        status: TournamentStatus.IN_PROGRESS
      });

      const result = await controller.updateStatus(1, dto);

      expect(result.status).toBe(TournamentStatus.IN_PROGRESS);
      expect(service.updateStatus).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('startTournament', () => {
    it('should start tournament', async () => {
      mockTournamentService.startTournament.mockResolvedValue({});
      await controller.startTournament(1, {});
      expect(service.startTournament).toHaveBeenCalledWith(1, {});
    });
  });
});
