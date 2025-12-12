import { BadRequestException } from '@nestjs/common';
import { BracketService, BracketStructure } from './bracket.service';
import {
  Tournament,
  TournamentStatus,
  TournamentType
} from '../entities/tournament.entity';
import {
  Match,
  MatchPhase,
  MatchStatus
} from '../../match/entities/match.entity';
import { Player } from '../../player/entities/player.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../entities/tournament-registration.entity';
import { Ranking } from '../../ranking/entities/ranking.entity';

const mockTournamentRepository = {
  findOne: jest.fn(),
  save: jest.fn()
};

const mockMatchRepository = {
  find: jest.fn()
};

const mockPlayerRepository = {};

const mockRegistrationRepository = {};

const mockRankingRepository = {};

const mockMatchService = {
  create: jest.fn()
};

const basePlayer = (id: number, name = `P${id}`): Player =>
  ({
    id,
    user: { firstName: name, lastName: 'Test' } as any
  }) as Player;

const buildTournament = (
  type: TournamentType,
  registrations: TournamentRegistration[]
): Tournament =>
  ({
    id: 1,
    type,
    name: 'T',
    description: '',
    location: '',
    status: TournamentStatus.REGISTRATION_CLOSED,
    minPlayers: 2,
    maxPlayers: 8,
    totalRounds: 0,
    currentRound: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-02'),
    rewards: [],
    pricing: {} as any,
    organizers: [],
    rankings: [],
    matches: [],
    registrations
  }) as unknown as Tournament;

describe('BracketService', () => {
  let service: BracketService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new BracketService(
      mockTournamentRepository as any,
      mockMatchRepository as any,
      mockPlayerRepository as any,
      mockRegistrationRepository as any,
      mockRankingRepository as any,
      mockMatchService as any
    );
  });

  describe('generateBracket', () => {
    it('throws when tournament not found', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.generateBracket(1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('throws when not enough confirmed players', async () => {
      const registrations: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: false,
          player: basePlayer(1)
        } as any
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, registrations)
      );
      await expect(service.generateBracket(1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('generates single elimination bracket and creates matches', async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2)
        } as any
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, regs)
      );
      jest
        .spyOn<any, any>(service as any, 'seedPlayers')
        .mockReturnValue(regs.map((r) => r.player));

      const bracket = await service.generateBracket(1);

      expect(bracket.totalRounds).toBe(1);
      expect(mockMatchService.create).toHaveBeenCalled();
      expect(mockTournamentRepository.save).toHaveBeenCalled();
    });

    it('generates swiss bracket with correct rounds', async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(3)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(4)
        } as any
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SWISS_SYSTEM, regs)
      );
      jest
        .spyOn<any, any>(service as any, 'seedPlayers')
        .mockReturnValue(regs.map((r) => r.player));

      const bracket = await service.generateBracket(1);
      expect(bracket.totalRounds).toBeGreaterThan(0);
      expect(bracket.type).toBe(TournamentType.SWISS_SYSTEM);
    });

    it('generates round robin bracket and rotates players', async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(3)
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(4)
        } as any
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.ROUND_ROBIN, regs)
      );
      jest
        .spyOn<any, any>(service as any, 'seedPlayers')
        .mockReturnValue(regs.map((r) => r.player));

      const bracket = await service.generateBracket(1);

      expect(bracket.totalRounds).toBe(3);
      const totalMatches = bracket.rounds.reduce(
        (acc, r) => acc + r.matches.length,
        0
      );
      expect(totalMatches).toBe(6);
    });
  });

  describe('generateSwissPairings', () => {
    it('returns pairings ordered by rankings on subsequent rounds', async () => {
      const players = [basePlayer(1), basePlayer(2)];
      const tournament: Tournament = {
        id: 1,
        type: TournamentType.SWISS_SYSTEM,
        registrations: [
          {
            player: players[0],
            status: RegistrationStatus.CONFIRMED,
            checkedIn: true
          } as any,
          {
            player: players[1],
            status: RegistrationStatus.CONFIRMED,
            checkedIn: true
          } as any
        ],
        rankings: [
          { player: { id: 1 }, points: 5, winRate: 80 } as any,
          { player: { id: 2 }, points: 3, winRate: 50 } as any
        ]
      } as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([]);
      const pairings = await service.generateSwissPairings(1, 2);

      expect(pairings.pairings[0].playerA.id).toBe(1);
    });

    it('creates bye when odd player count', async () => {
      const players = [basePlayer(1), basePlayer(2), basePlayer(3)];
      const tournament: Tournament = {
        id: 2,
        type: TournamentType.SWISS_SYSTEM,
        name: 'Swiss',
        description: '',
        location: '',
        status: TournamentStatus.REGISTRATION_CLOSED,
        startDate: new Date(),
        endDate: new Date(),
        currentRound: 1,
        totalRounds: 3,
        pricing: {} as any,
        rewards: [],
        organizers: [],
        matches: [],
        registrations: players.map((p) => ({
          player: p,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true
        })) as any,
        rankings: []
      } as unknown as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([]);
      const pairings = await service.generateSwissPairings(2, 1);
      expect(pairings.pairings.some((p) => !p.playerB)).toBe(true);
    });
  });

  describe('getBracket', () => {
    it('maps matches to bracket structure', async () => {
      const matches: Match[] = [
        {
          id: 10,
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          playerA: basePlayer(1),
          playerB: basePlayer(2),
          winner: basePlayer(1),
          status: MatchStatus.FINISHED
        } as any
      ];
      const tournament: Tournament = {
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        totalRounds: 1,
        matches
      } as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      const bracket = await service.getBracket(1);

      expect(bracket.rounds[0].matches[0].winnerId).toBe(1);
      expect(bracket.type).toBe(TournamentType.SINGLE_ELIMINATION);
    });

    it('throws when bracket tournament missing', async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.getBracket(999)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('helpers', () => {
    it('calculates phases for rounds', () => {
      const final = (service as any).getPhaseForRound(3, 3);
      const semi = (service as any).getPhaseForRound(2, 3);
      const qual = (service as any).getPhaseForRound(1, 3);
      expect(final).toBe(MatchPhase.FINAL);
      expect(semi).toBe(MatchPhase.SEMI_FINAL);
      expect(qual).toBe(MatchPhase.QUARTER_FINAL);
    });

    it('calculates swiss rounds count', () => {
      const rounds = (service as any).calculateSwissRounds(5);
      expect(rounds).toBeGreaterThan(0);
    });
  });
});
