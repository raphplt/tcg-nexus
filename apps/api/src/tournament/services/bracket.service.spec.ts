import { BadRequestException } from "@nestjs/common";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";
import { Player } from "../../player/entities/player.entity";
import { Ranking } from "../../ranking/entities/ranking.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";
import { BracketService, BracketStructure } from "./bracket.service";

const mockTournamentRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockMatchRepository = {
  create: jest.fn((value) => value),
  find: jest.fn(),
  save: jest.fn((value) => ({ id: 100, ...value })),
};

const mockPlayerRepository = {};

const mockRegistrationRepository = {};

const mockRankingRepository = {};

const mockSeedingService = {
  seedPlayers: jest.fn((players: Player[]) =>
    players.map((player, index) => ({ ...player, seed: index + 1 })),
  ),
};

const basePlayer = (id: number, name = `P${id}`): Player =>
  ({
    id,
    user: { firstName: name, lastName: "Test" } as any,
  }) as Player;

const buildTournament = (
  type: TournamentType,
  registrations: TournamentRegistration[],
): Tournament =>
  ({
    id: 1,
    type,
    name: "T",
    description: "",
    location: "",
    status: TournamentStatus.REGISTRATION_CLOSED,
    minPlayers: 2,
    maxPlayers: 8,
    totalRounds: 0,
    currentRound: 0,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-02"),
    rewards: [],
    pricing: {} as any,
    organizers: [],
    rankings: [],
    matches: [],
    registrations,
  }) as unknown as Tournament;

describe("BracketService", () => {
  let service: BracketService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockMatchRepository.create.mockImplementation((value) => value);
    mockMatchRepository.save.mockImplementation((value) => ({
      id: mockMatchRepository.save.mock.calls.length,
      ...value,
    }));
    mockSeedingService.seedPlayers.mockImplementation((players: Player[]) =>
      players.map((player, index) => ({ ...player, seed: index + 1 })),
    );
    service = new BracketService(
      mockTournamentRepository as any,
      mockMatchRepository as any,
      mockPlayerRepository as any,
      mockRegistrationRepository as any,
      mockRankingRepository as any,
      mockSeedingService as any,
    );
  });

  describe("generateBracket", () => {
    it("throws when tournament not found", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.generateBracket(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws when not enough confirmed players", async () => {
      const registrations: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: false,
          player: basePlayer(1),
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, registrations),
      );
      await expect(service.generateBracket(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("generates single elimination bracket and creates matches", async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2),
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, regs),
      );
      const bracket = await service.generateBracket(1);

      expect(bracket.totalRounds).toBe(1);
      expect(mockMatchRepository.save).toHaveBeenCalled();
      expect(mockTournamentRepository.save).toHaveBeenCalled();
    });

    it("does not require check-in when the start option is disabled", async () => {
      const regs = [basePlayer(1), basePlayer(2)].map(
        (player) =>
          ({
            status: RegistrationStatus.CONFIRMED,
            checkedIn: false,
            player,
          }) as TournamentRegistration,
      );
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, regs),
      );

      await expect(
        service.generateBracket(1, { checkInRequired: false }),
      ).resolves.toEqual(expect.objectContaining({ totalRounds: 1 }));
    });

    it("passes the selected method to the seeding service", async () => {
      const regs = [basePlayer(1), basePlayer(2)].map(
        (player) =>
          ({
            status: RegistrationStatus.CONFIRMED,
            checkedIn: true,
            player,
          }) as TournamentRegistration,
      );
      const tournament = buildTournament(
        TournamentType.SINGLE_ELIMINATION,
        regs,
      );
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await service.generateBracket(1, { seedingMethod: "elo" as any });

      expect(mockSeedingService.seedPlayers).toHaveBeenCalledWith(
        regs.map((registration) => registration.player),
        tournament,
        "elo",
      );
    });

    it("creates automatic bye matches for a six-player bracket", async () => {
      const regs = Array.from({ length: 6 }, (_, index) => {
        return {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(index + 1),
        } as TournamentRegistration;
      });
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SINGLE_ELIMINATION, regs),
      );

      const bracket = await service.generateBracket(1);
      const firstRound = bracket.rounds[0];
      const savedMatches = mockMatchRepository.create.mock.calls.map(
        ([match]) => match,
      );

      expect(bracket.totalRounds).toBe(3);
      expect(firstRound.matches).toHaveLength(4);
      expect(savedMatches).toHaveLength(4);
      expect(
        savedMatches.filter((match) => match.status === MatchStatus.FINISHED),
      ).toHaveLength(2);
      expect(
        savedMatches.filter((match) => match.status === MatchStatus.SCHEDULED),
      ).toHaveLength(2);
    });

    it("generates swiss bracket with correct rounds", async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(3),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(4),
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.SWISS_SYSTEM, regs),
      );
      const bracket = await service.generateBracket(1);
      expect(bracket.totalRounds).toBeGreaterThan(0);
      expect(bracket.type).toBe(TournamentType.SWISS_SYSTEM);
    });

    it("generates round robin bracket and rotates players", async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(3),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(4),
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.ROUND_ROBIN, regs),
      );
      const bracket = await service.generateBracket(1);

      expect(bracket.totalRounds).toBe(3);
      const totalMatches = bracket.rounds.reduce(
        (acc, r) => acc + r.matches.length,
        0,
      );
      expect(totalMatches).toBe(6);
    });

    it("throws for unsupported tournament type", async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2),
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament("UNKNOWN" as any, regs),
      );

      await expect(service.generateBracket(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("generates double elimination using single elimination fallback", async () => {
      const regs: TournamentRegistration[] = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(1),
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: basePlayer(2),
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(
        buildTournament(TournamentType.DOUBLE_ELIMINATION, regs),
      );
      const bracket = await service.generateBracket(1);
      expect(bracket.type).toBe(TournamentType.SINGLE_ELIMINATION);
      expect(mockMatchRepository.save).toHaveBeenCalled();
    });
  });

  describe("generateSwissPairings", () => {
    it("returns pairings ordered by rankings on subsequent rounds", async () => {
      const players = [basePlayer(1), basePlayer(2)];
      const tournament: Tournament = {
        id: 1,
        type: TournamentType.SWISS_SYSTEM,
        registrations: [
          {
            player: players[0],
            status: RegistrationStatus.CONFIRMED,
            checkedIn: true,
          } as any,
          {
            player: players[1],
            status: RegistrationStatus.CONFIRMED,
            checkedIn: true,
          } as any,
        ],
        rankings: [
          { player: { id: 1 }, points: 5, winRate: 80 } as any,
          { player: { id: 2 }, points: 3, winRate: 50 } as any,
        ],
      } as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([]);
      const pairings = await service.generateSwissPairings(1, 2);

      expect(pairings.pairings[0].playerA.id).toBe(1);
    });

    it("uses winRate tie-breaker when points equal", async () => {
      const players = [basePlayer(1), basePlayer(2)];
      const tournament: Tournament = {
        id: 5,
        type: TournamentType.SWISS_SYSTEM,
        registrations: players.map((p) => ({
          player: p,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
        })) as any,
        rankings: [
          { player: { id: 1 }, points: 3, winRate: 40 } as any,
          { player: { id: 2 }, points: 3, winRate: 60 } as any,
        ],
      } as any;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([]);

      const pairings = await service.generateSwissPairings(5, 2);
      expect(pairings.pairings[0].playerA.id).toBe(2); // higher winRate first
    });

    it("creates bye when odd player count", async () => {
      const players = [basePlayer(1), basePlayer(2), basePlayer(3)];
      const tournament: Tournament = {
        id: 2,
        type: TournamentType.SWISS_SYSTEM,
        name: "Swiss",
        description: "",
        location: "",
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
          checkedIn: true,
        })) as any,
        rankings: [],
      } as unknown as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([]);
      const pairings = await service.generateSwissPairings(2, 1);
      expect(pairings.pairings.some((p) => !p.playerB)).toBe(true);
    });

    it("avoids rematches when possible", async () => {
      const players = [
        basePlayer(1),
        basePlayer(2),
        basePlayer(3),
        basePlayer(4),
      ];
      const tournament: Tournament = {
        id: 3,
        type: TournamentType.SWISS_SYSTEM,
        registrations: players.map((p) => ({
          player: p,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
        })) as any,
        rankings: [
          { player: { id: 1 }, points: 4, winRate: 50 } as any,
          { player: { id: 2 }, points: 3, winRate: 50 } as any,
          { player: { id: 3 }, points: 2, winRate: 50 } as any,
          { player: { id: 4 }, points: 1, winRate: 50 } as any,
        ],
      } as any;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([
        {
          playerA: { id: 1 },
          playerB: { id: 2 },
        } as any,
      ]);

      const pairings = await service.generateSwissPairings(3, 2);
      // player 1 should not be paired with player 2 due to previous match
      expect(pairings.pairings[0].playerA.id).toBe(1);
      expect(pairings.pairings[0].playerB?.id).toBe(3);
    });

    it("falls back to first available opponent when all are rematches", async () => {
      const players = [basePlayer(1), basePlayer(2)];
      const tournament: Tournament = {
        id: 4,
        type: TournamentType.SWISS_SYSTEM,
        registrations: players.map((p) => ({
          player: p,
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
        })) as any,
        rankings: [
          { player: { id: 1 }, points: 1, winRate: 50 } as any,
          { player: { id: 2 }, points: 0, winRate: 50 } as any,
        ],
      } as any;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockMatchRepository.find.mockResolvedValue([
        {
          playerA: { id: 1 },
          playerB: { id: 2 },
        } as any,
      ]);

      const pairings = await service.generateSwissPairings(4, 2);
      expect(pairings.pairings[0].playerA.id).toBe(1);
      expect(pairings.pairings[0].playerB?.id).toBe(2);
    });
  });

  describe("getBracket", () => {
    it("maps matches to bracket structure", async () => {
      const matches: Match[] = [
        {
          id: 10,
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          playerA: basePlayer(1),
          playerB: basePlayer(2),
          winner: basePlayer(1),
          status: MatchStatus.FINISHED,
        } as any,
      ];
      const tournament: Tournament = {
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        totalRounds: 1,
        matches,
      } as Tournament;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      const bracket = await service.getBracket(1);

      expect(bracket.rounds[0].matches[0].winnerId).toBe(1);
      expect(bracket.type).toBe(TournamentType.SINGLE_ELIMINATION);
    });

    it("throws when bracket tournament missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.getBracket(999)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("maps matches with missing players safely", async () => {
      const matches: Match[] = [
        {
          id: 11,
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          playerA: undefined,
          playerB: basePlayer(2),
          winner: undefined,
          status: MatchStatus.SCHEDULED,
        } as any,
        {
          id: 12,
          round: 2,
          phase: MatchPhase.SEMI_FINAL,
          playerA: basePlayer(3),
          playerB: undefined,
          winner: undefined,
          status: MatchStatus.SCHEDULED,
        } as any,
      ];
      const tournament: Tournament = {
        id: 2,
        type: TournamentType.SINGLE_ELIMINATION,
        totalRounds: 2,
        matches,
      } as any;

      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      const bracket = await service.getBracket(2);
      expect(bracket.rounds).toHaveLength(2);
      expect(bracket.rounds[0].matches[0].playerA).toBeUndefined();
      expect(bracket.rounds[0].matches[0].playerB?.id).toBe(2);
      expect(bracket.rounds[1].matches[0].playerB).toBeUndefined();
    });
  });

  describe("helpers", () => {
    it("calculates phases for rounds", () => {
      const final = (service as any).getPhaseForRound(3, 3);
      const semi = (service as any).getPhaseForRound(2, 3);
      const qual = (service as any).getPhaseForRound(1, 3);
      expect(final).toBe(MatchPhase.FINAL);
      expect(semi).toBe(MatchPhase.SEMI_FINAL);
      expect(qual).toBe(MatchPhase.QUARTER_FINAL);
    });

    it("calculates swiss rounds count", () => {
      const rounds = (service as any).calculateSwissRounds(5);
      expect(rounds).toBeGreaterThan(0);
    });
  });
});
