import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TournamentOrchestrationService } from './tournament-orchestration.service';
import { Tournament, TournamentStatus, TournamentType } from '../entities/tournament.entity';
import { Match, MatchStatus, MatchPhase } from '../../match/entities/match.entity';
import { TournamentRegistration, RegistrationStatus } from '../entities/tournament-registration.entity';

const mockTournamentRepository = {
  findOne: jest.fn()
};
const mockMatchRepository = {};
const mockRegistrationRepository = {};
const mockBracketService = {
  generateBracket: jest.fn(),
  generateSwissPairings: jest.fn()
};
const mockSeedingService = {};
const mockRankingService = {
  updateTournamentRankings: jest.fn()
};
const mockMatchService = {
  create: jest.fn()
};

const mockDataSource = {
  transaction: jest.fn()
};

const baseTournament = (): Tournament =>
  ({
    id: 1,
    status: TournamentStatus.REGISTRATION_CLOSED,
    type: TournamentType.SWISS_SYSTEM,
    name: 'T',
    description: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    currentRound: 1,
    totalRounds: 3,
    registrations: [],
    matches: [],
    rewards: [],
    pricing: {} as any,
    organizers: [],
    rankings: []
  } as unknown as Tournament);

describe('TournamentOrchestrationService', () => {
  let service: TournamentOrchestrationService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockDataSource.transaction.mockImplementation(async (cb: any) => cb({
      findOne: mockTournamentRepository.findOne,
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn()
    }));

    service = new TournamentOrchestrationService(
      mockTournamentRepository as any,
      mockMatchRepository as any,
      mockRegistrationRepository as any,
      mockBracketService as any,
      mockSeedingService as any,
      mockRankingService as any,
      mockMatchService as any,
      mockDataSource as any
    );
  });

  describe('startTournament', () => {
    it('throws when tournament missing', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.startTournament(1, {})).rejects.toThrow(NotFoundException);
    });

    it('starts tournament and generates bracket', async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      tournament.minPlayers = 2;
      tournament.maxPlayers = 4;
      tournament.registrations = [
        { status: RegistrationStatus.CONFIRMED, checkedIn: true, player: { id: 1 } } as any,
        { status: RegistrationStatus.CONFIRMED, checkedIn: true, player: { id: 2 } } as any
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockBracketService.generateBracket.mockResolvedValue({
        totalRounds: 2
      } as any);

      await service.startTournament(1, { checkInRequired: true });
      expect(mockBracketService.generateBracket).toHaveBeenCalledWith(1);
    });
  });

  describe('advanceToNextRound', () => {
    it('throws if tournament not found', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.advanceToNextRound(1)).rejects.toThrow(NotFoundException);
    });

    it('throws if matches unfinished', async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.matches = [{ round: 1, status: MatchStatus.IN_PROGRESS } as Match];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      await expect(service.advanceToNextRound(1)).rejects.toThrow(BadRequestException);
    });

    it('creates swiss pairings for next round', async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.matches = [
        { round: 1, status: MatchStatus.FINISHED } as Match,
        { round: 1, status: MatchStatus.FORFEIT } as Match
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockBracketService.generateSwissPairings.mockResolvedValue({
        pairings: [
          { playerA: { id: 1 }, playerB: { id: 2 }, tableNumber: 1 },
          { playerA: { id: 3 }, playerB: undefined, tableNumber: 2 }
        ]
      });

      const result = await service.advanceToNextRound(1);
      expect(result.newRound).toBe(2);
      expect(mockMatchService.create).toHaveBeenCalledWith(
        expect.objectContaining({ round: 2, playerAId: 1, playerBId: 2 })
      );
    });
  });

  describe('finishTournament', () => {
    it('marks tournament finished and saves eliminations', async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 2;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          save: jest.fn(),
          find: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
          transaction: mockDataSource.transaction
        })
      );

      await service.finishTournament(1);
      expect(mockRankingService.updateTournamentRankings).toHaveBeenCalledWith(1);
    });
  });

  describe('cancelTournament', () => {
    it('throws if tournament missing', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.cancelTournament(1)).rejects.toThrow(NotFoundException);
    });

    it('cancels when not finished', async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.DRAFT;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);

      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          update: jest.fn(),
          save: jest.fn()
        })
      );

      await service.cancelTournament(1, 'bad weather');
    });
  });

  describe('getTournamentProgress', () => {
    it('returns live stats', async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 2,
        matches: [
          { status: MatchStatus.FINISHED },
          { status: MatchStatus.SCHEDULED }
        ] as any,
        registrations: [
          { status: RegistrationStatus.CONFIRMED, eliminatedAt: null },
          { status: RegistrationStatus.CONFIRMED, eliminatedAt: new Date() }
        ]
      } as Tournament);

      const progress = await service.getTournamentProgress(1);
      expect(progress.completedMatches).toBe(1);
      expect(progress.totalMatches).toBe(2);
      expect(progress.progressPercentage).toBeGreaterThan(0);
    });
  });

  describe('private helpers', () => {
    it('detects tournament completion for elimination', () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.SINGLE_ELIMINATION;
      tournament.registrations = [
        { status: RegistrationStatus.CONFIRMED, eliminatedAt: null },
        { status: RegistrationStatus.CONFIRMED, eliminatedAt: new Date() }
      ] as any;
      const done = (service as any).isTournamentComplete(tournament, 2);
      expect(done).toBe(true);
    });

    it('computes phase for round', () => {
      const phase = (service as any).getPhaseForRound(2, 3);
      expect(phase).toBe(MatchPhase.SEMI_FINAL);
    });
  });
});
