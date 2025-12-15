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
    updateTournamentMatch: jest.fn(),
    getTournamentRegistrations: jest.fn(),
    confirmRegistration: jest.fn(),
    cancelRegistration: jest.fn(),
    checkInPlayer: jest.fn(),
    fillWithRandomPlayers: jest.fn(),
    checkInAllPlayers: jest.fn()
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('getUpcomingTournaments', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getUpcomingTournaments.mockResolvedValue([
        { id: 1 }
      ]);

      const result = await controller.getUpcomingTournaments(5);

      expect(result).toEqual([{ id: 1 }]);
      expect(service.getUpcomingTournaments).toHaveBeenCalledWith(5);
    });
  });

  describe('getPastTournaments', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getPastTournaments.mockResolvedValue([{ id: 1 }]);

      const result = await controller.getPastTournaments(3);

      expect(result).toEqual([{ id: 1 }]);
      expect(service.getPastTournaments).toHaveBeenCalledWith(3);
    });
  });

  describe('getTournamentStats', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getTournamentStats.mockResolvedValue({
        totalPlayers: 2
      });

      const result = await controller.getTournamentStats(123);

      expect(result).toEqual({ totalPlayers: 2 });
      expect(service.getTournamentStats).toHaveBeenCalledWith(123);
    });
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

  describe('update', () => {
    it('should delegate to service', async () => {
      mockTournamentService.update.mockResolvedValue({
        id: 1,
        name: 'updated'
      });

      const result = await controller.update(1, { name: 'updated' } as any);

      expect(result).toEqual({ id: 1, name: 'updated' });
      expect(service.update).toHaveBeenCalledWith(1, { name: 'updated' });
    });
  });

  describe('registerPlayer', () => {
    it('should register a player', async () => {
      const dto = { playerId: 2, notes: 'hello' };
      const user = { id: 1, player: { id: 2 } } as User;
      mockTournamentService.registerPlayer.mockResolvedValue({
        status: 'CONFIRMED'
      });

      const result = await controller.registerPlayer(1, dto, user);

      expect(result).toEqual({ status: 'CONFIRMED' });
      expect(service.registerPlayer).toHaveBeenCalledWith({
        tournamentId: 1,
        playerId: 2,
        notes: 'hello'
      });
    });

    it('should use user player id if not provided', async () => {
      const dto = {};
      const user = { id: 1, player: { id: 2 } } as User;
      mockTournamentService.registerPlayer.mockResolvedValue({
        status: 'CONFIRMED'
      });

      await controller.registerPlayer(1, dto as any, user);

      expect(service.registerPlayer).toHaveBeenCalledWith({
        tournamentId: 1,
        playerId: 2
      });
    });

    it('should fallback to 0 if no player id is available', async () => {
      const dto = {};
      const user = { id: 1 } as User;
      mockTournamentService.registerPlayer.mockResolvedValue({
        status: 'CONFIRMED'
      });

      await controller.registerPlayer(99, dto as any, user);

      expect(service.registerPlayer).toHaveBeenCalledWith({
        tournamentId: 99,
        playerId: 0
      });
    });
  });

  describe('unregisterPlayer', () => {
    it('should delegate to service', async () => {
      mockTournamentService.unregisterPlayer.mockResolvedValue(undefined);
      await controller.unregisterPlayer(1, 2);
      expect(service.unregisterPlayer).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('getPlayerTournaments', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getPlayerTournaments.mockResolvedValue({
        data: []
      });
      const query: TournamentQueryDto = { page: 1, limit: 10 };

      const result = await controller.getPlayerTournaments(10, query);

      expect(result).toEqual({ data: [] });
      expect(service.getPlayerTournaments).toHaveBeenCalledWith(10, query);
    });
  });

  describe('remove', () => {
    it('should delegate to service', async () => {
      mockTournamentService.remove.mockResolvedValue(undefined);
      const user = { id: 7 } as User;

      await controller.remove(1, user);

      expect(service.remove).toHaveBeenCalledWith(1, user);
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

    it('should pass undefined options', async () => {
      mockTournamentService.startTournament.mockResolvedValue({});
      await controller.startTournament(1, undefined);
      expect(service.startTournament).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('finishTournament', () => {
    it('should delegate to service', async () => {
      mockTournamentService.finishTournament.mockResolvedValue({
        status: 'FINISHED'
      });

      const result = await controller.finishTournament(1);

      expect(result).toEqual({ status: 'FINISHED' });
      expect(service.finishTournament).toHaveBeenCalledWith(1);
    });
  });

  describe('cancelTournament', () => {
    it('should pass reason from body', async () => {
      mockTournamentService.cancelTournament.mockResolvedValue({
        status: 'CANCELLED'
      });

      const result = await controller.cancelTournament(1, { reason: 'x' });

      expect(result).toEqual({ status: 'CANCELLED' });
      expect(service.cancelTournament).toHaveBeenCalledWith(1, 'x');
    });

    it('should pass undefined reason when body missing', async () => {
      mockTournamentService.cancelTournament.mockResolvedValue({
        status: 'CANCELLED'
      });
      await controller.cancelTournament(1, undefined);
      expect(service.cancelTournament).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('advanceToNextRound', () => {
    it('should delegate to service', async () => {
      mockTournamentService.advanceToNextRound.mockResolvedValue({
        currentRound: 2
      });
      const result = await controller.advanceToNextRound(1);
      expect(result).toEqual({ currentRound: 2 });
      expect(service.advanceToNextRound).toHaveBeenCalledWith(1);
    });
  });

  describe('getBracket', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getBracket.mockResolvedValue({ rounds: [] });
      const result = await controller.getBracket(1);
      expect(result).toEqual({ rounds: [] });
      expect(service.getBracket).toHaveBeenCalledWith(1);
    });
  });

  describe('getCurrentPairings', () => {
    it('should delegate to service with round', async () => {
      mockTournamentService.getCurrentPairings.mockResolvedValue([{ id: 1 }]);
      const result = await controller.getCurrentPairings(1, 3);
      expect(result).toEqual([{ id: 1 }]);
      expect(service.getCurrentPairings).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('getTournamentRankings', () => {
    it('should delegate to service', async () => {
      mockTournamentService.getTournamentRankings.mockResolvedValue([
        { rank: 1 }
      ]);
      const result = await controller.getTournamentRankings(1);
      expect(result).toEqual([{ rank: 1 }]);
      expect(service.getTournamentRankings).toHaveBeenCalledWith(1);
    });
  });

  describe('getTournamentProgress', () => {
    it('should delegate to service', () => {
      mockTournamentService.getTournamentProgress.mockReturnValue({
        status: 'IN_PROGRESS'
      });
      const result = controller.getTournamentProgress(1);
      expect(result).toEqual({ status: 'IN_PROGRESS' });
      expect(service.getTournamentProgress).toHaveBeenCalledWith(1);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should delegate to service', () => {
      mockTournamentService.getAvailableTransitions.mockReturnValue([
        { from: 'DRAFT', to: 'OPEN' }
      ]);
      const result = controller.getAvailableTransitions(1);
      expect(result).toEqual([{ from: 'DRAFT', to: 'OPEN' }]);
      expect(service.getAvailableTransitions).toHaveBeenCalledWith(1);
    });
  });

  describe('validateStateTransition', () => {
    it('should cast and delegate', () => {
      mockTournamentService.validateStateTransition.mockReturnValue({
        valid: true
      });
      const result = controller.validateStateTransition(1, {
        targetStatus: 'IN_PROGRESS'
      });
      expect(result).toEqual({ valid: true });
      expect(service.validateStateTransition).toHaveBeenCalledWith(
        1,
        'IN_PROGRESS'
      );
    });
  });

  describe('getTournamentMatches', () => {
    it('should delegate with filters', () => {
      mockTournamentService.getTournamentMatches.mockReturnValue([{ id: 1 }]);
      const result = controller.getTournamentMatches(1, 2, 'FINISHED');
      expect(result).toEqual([{ id: 1 }]);
      expect(service.getTournamentMatches).toHaveBeenCalledWith(1, {
        round: 2,
        status: 'FINISHED'
      });
    });
  });

  describe('getTournamentMatch', () => {
    it('should delegate', () => {
      mockTournamentService.getTournamentMatch.mockReturnValue({ id: 5 });
      const result = controller.getTournamentMatch(1, 5);
      expect(result).toEqual({ id: 5 });
      expect(service.getTournamentMatch).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('updateTournamentMatch', () => {
    it('should delegate', () => {
      mockTournamentService.updateTournamentMatch.mockReturnValue({
        id: 5,
        status: 'FINISHED'
      });
      const result = controller.updateTournamentMatch(1, 5, {
        playerAScore: 1
      });
      expect(result).toEqual({ id: 5, status: 'FINISHED' });
      expect(service.updateTournamentMatch).toHaveBeenCalledWith(1, 5, {
        playerAScore: 1
      });
    });
  });

  describe('getTournamentRegistrations', () => {
    it('should delegate', () => {
      mockTournamentService.getTournamentRegistrations.mockReturnValue([
        { id: 1 }
      ]);
      const result = controller.getTournamentRegistrations(1, 'CONFIRMED');
      expect(result).toEqual([{ id: 1 }]);
      expect(service.getTournamentRegistrations).toHaveBeenCalledWith(
        1,
        'CONFIRMED'
      );
    });
  });

  describe('confirmRegistration', () => {
    it('should delegate', () => {
      mockTournamentService.confirmRegistration.mockReturnValue({
        status: 'CONFIRMED'
      });
      const result = controller.confirmRegistration(1, 9);
      expect(result).toEqual({ status: 'CONFIRMED' });
      expect(service.confirmRegistration).toHaveBeenCalledWith(1, 9);
    });
  });

  describe('cancelRegistration', () => {
    it('should delegate and pass reason', () => {
      mockTournamentService.cancelRegistration.mockReturnValue({
        status: 'CANCELLED'
      });
      const result = controller.cancelRegistration(1, 9, { reason: 'nope' });
      expect(result).toEqual({ status: 'CANCELLED' });
      expect(service.cancelRegistration).toHaveBeenCalledWith(1, 9, 'nope');
    });
  });

  describe('checkInPlayer', () => {
    it('should delegate with current user', () => {
      mockTournamentService.checkInPlayer.mockReturnValue({ checkedIn: true });
      const user = { id: 1 } as User;
      const result = controller.checkInPlayer(1, 9, user);
      expect(result).toEqual({ checkedIn: true });
      expect(service.checkInPlayer).toHaveBeenCalledWith(1, 9, 1);
    });
  });

  describe('fillWithPlayers', () => {
    it('should default count to 8', async () => {
      mockTournamentService.fillWithRandomPlayers.mockResolvedValue({
        registeredCount: 1,
        registrations: []
      });
      const result = await controller.fillWithPlayers(1, undefined);
      expect(result).toEqual({ registeredCount: 1, registrations: [] });
      expect(service.fillWithRandomPlayers).toHaveBeenCalledWith(1, 8);
    });

    it('should use provided count', async () => {
      mockTournamentService.fillWithRandomPlayers.mockResolvedValue({
        registeredCount: 2,
        registrations: []
      });
      const result = await controller.fillWithPlayers(1, { count: 2 });
      expect(result).toEqual({ registeredCount: 2, registrations: [] });
      expect(service.fillWithRandomPlayers).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('checkInAllPlayers', () => {
    it('should delegate', async () => {
      mockTournamentService.checkInAllPlayers.mockResolvedValue({
        checkedInCount: 3
      });
      const result = await controller.checkInAllPlayers(1);
      expect(result).toEqual({ checkedInCount: 3 });
      expect(service.checkInAllPlayers).toHaveBeenCalledWith(1);
    });
  });
});
