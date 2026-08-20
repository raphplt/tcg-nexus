import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";
import { TournamentOrchestrationService } from "./tournament-orchestration.service";
import { SwissPairingService } from "./swiss-pairing.service";

const mockTournamentRepository = {
  findOne: jest.fn(),
};
const mockMatchRepository = {};
const mockRegistrationRepository = {};
const mockBracketService = {
  generateBracket: jest.fn(),
  generateSwissPairings: jest.fn(),
};
const mockRankingService = {
  updateTournamentRankings: jest.fn(),
};
const mockMatchService = {
  create: jest.fn(),
  ensureTournamentMatchSessions: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const baseTournament = (): Tournament =>
  ({
    id: 1,
    status: TournamentStatus.REGISTRATION_CLOSED,
    type: TournamentType.SINGLE_ELIMINATION,
    name: "T",
    description: "",
    location: "",
    startDate: new Date(),
    endDate: new Date(),
    currentRound: 1,
    totalRounds: 3,
    registrations: [],
    matches: [],
    rewards: [],
    pricing: {} as any,
    organizers: [],
    rankings: [],
  }) as unknown as Tournament;

describe("TournamentOrchestrationService", () => {
  let service: TournamentOrchestrationService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockDataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        findOne: mockTournamentRepository.findOne,
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      }),
    );

    service = new TournamentOrchestrationService(
      mockTournamentRepository as any,
      mockMatchRepository as any,
      mockRegistrationRepository as any,
      mockBracketService as any,
      new SwissPairingService(),
      mockRankingService as any,
      mockMatchService as any,
      mockDataSource as any,
      { emit: jest.fn() } as any,
    );
  });

  describe("startTournament", () => {
    it("throws when tournament missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.startTournament(1, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it("starts tournament and generates bracket", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      tournament.minPlayers = 2;
      tournament.maxPlayers = 4;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 2 },
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      mockBracketService.generateBracket.mockResolvedValue({
        totalRounds: 2,
      } as any);

      await service.startTournament(1, { checkInRequired: true });
      expect(mockBracketService.generateBracket).toHaveBeenCalledWith(1, {
        checkInRequired: true,
        manager: expect.any(Object),
        seedingMethod: undefined,
      });
      expect(
        mockMatchService.ensureTournamentMatchSessions,
      ).toHaveBeenCalledWith(1, 1);
      expect(mockRankingService.updateTournamentRankings).toHaveBeenCalledWith(
        1,
      );
    });

    it("rejects start when status is not REGISTRATION_CLOSED", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.DRAFT;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 2 },
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await expect(service.startTournament(1, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects start when check-in required and not enough checked-in players", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      tournament.minPlayers = 2;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: false,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 2 },
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await expect(
        service.startTournament(1, { checkInRequired: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects start when too many players for maxPlayers", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      tournament.minPlayers = 2;
      tournament.maxPlayers = 1;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          checkedIn: true,
          player: { id: 2 },
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await expect(service.startTournament(1, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects formats whose engine is not certified yet", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.DOUBLE_ELIMINATION;
      tournament.minPlayers = 2;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          player: { id: 2 },
        } as any,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await expect(service.startTournament(1, {})).rejects.toThrow(
        "Ce format n'est pas encore orchestré par Nexus",
      );
      expect(mockBracketService.generateBracket).not.toHaveBeenCalled();
    });

    it("rejects startup for externally managed tournaments", async () => {
      const tournament = baseTournament();
      tournament.isExternal = true;
      tournament.minPlayers = 2;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          player: { id: 1 },
        } as TournamentRegistration,
        {
          status: RegistrationStatus.CONFIRMED,
          player: { id: 2 },
        } as TournamentRegistration,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      await expect(service.startTournament(1)).rejects.toThrow(
        "Un tournoi externe doit être géré sur la plateforme de l’organisateur",
      );
      expect(mockBracketService.generateBracket).not.toHaveBeenCalled();
    });
  });

  describe("advanceToNextRound", () => {
    it("throws if tournament not found", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.advanceToNextRound(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws if matches unfinished", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.matches = [
        { round: 1, status: MatchStatus.IN_PROGRESS } as Match,
      ];
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      await expect(service.advanceToNextRound(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each([TournamentType.DOUBLE_ELIMINATION])(
      "rejects advancement for externally managed format %s",
      async (type) => {
        const tournament = baseTournament();
        tournament.type = type;
        tournament.status = TournamentStatus.IN_PROGRESS;
        tournament.matches = [
          { round: 1, status: MatchStatus.FINISHED } as Match,
          { round: 1, status: MatchStatus.FORFEIT } as Match,
        ];
        mockTournamentRepository.findOne.mockResolvedValue(tournament);

        await expect(service.advanceToNextRound(1)).rejects.toThrow(
          "Ce format est suivi sur la plateforme externe de l’organisateur",
        );
      },
    );

    it("throws if tournament is not in progress", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.REGISTRATION_CLOSED;
      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      await expect(service.advanceToNextRound(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("advances elimination round based on scores and eliminates losers", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.SINGLE_ELIMINATION;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 1;
      tournament.totalRounds = 2;
      tournament.registrations = [
        {
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: null,
          player: { id: 1 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: null,
          player: { id: 2 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: null,
          player: { id: 3 },
        } as any,
        {
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: null,
          player: { id: 4 },
        } as any,
      ];
      tournament.matches = [
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 1 },
          playerB: { id: 2 },
          playerAScore: 2,
          playerBScore: 1,
          winner: undefined,
        } as any,
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 3 },
          playerB: { id: 4 },
          playerAScore: 0,
          playerBScore: 3,
          winner: undefined,
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(tournament);

      const reg1 = { eliminatedAt: null } as any;
      const reg2 = { eliminatedAt: null } as any;
      const manager = {
        findOne: jest.fn().mockImplementation(async (entity: any) => {
          if (entity && entity.name === "Tournament") {
            return tournament;
          }
          // TournamentRegistration lookups (losers)
          if (entity && entity.name === "TournamentRegistration") {
            if (!reg1.__used) {
              reg1.__used = true;
              return reg1;
            }
            return reg2;
          }
          return null;
        }),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      const result = await service.advanceToNextRound(1);
      expect(result.newRound).toBe(2);
      expect(result.matchesCreated).toBe(1);
      expect(result.playersAdvanced).toBe(2);
      expect(result.playersEliminated).toBe(2);
      expect(mockMatchService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          round: 2,
          tournamentId: 1,
          playerAId: 1,
          playerBId: 4,
        }),
      );
      expect(manager.save).toHaveBeenCalled();
    });

    it("advances a round robin without creating matches nor eliminating", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.ROUND_ROBIN;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 1;
      tournament.totalRounds = 3;
      tournament.registrations = [];
      tournament.matches = [
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 1 },
          playerB: { id: 2 },
        } as any,
        {
          round: 2,
          status: MatchStatus.SCHEDULED,
          playerA: { id: 1 },
          playerB: { id: 3 },
        } as any,
        {
          round: 2,
          status: MatchStatus.SCHEDULED,
          playerA: { id: 2 },
          playerB: { id: 4 },
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      const manager = {
        findOne: jest.fn().mockResolvedValue(tournament),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      const result = await service.advanceToNextRound(1);

      expect(result.newRound).toBe(2);
      expect(result.matchesCreated).toBe(0);
      expect(result.playersEliminated).toBe(0);
      expect(result.playersAdvanced).toBe(4);
      expect(mockMatchService.create).not.toHaveBeenCalled();
      expect(tournament.currentRound).toBe(2);
      expect(tournament.status).toBe(TournamentStatus.IN_PROGRESS);
    });

    it("pairs the next swiss round from the standings", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.SWISS_SYSTEM;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 1;
      tournament.totalRounds = 3;
      tournament.registrations = [1, 2, 3, 4].map(
        (id) =>
          ({
            status: RegistrationStatus.CONFIRMED,
            player: { id },
            droppedAt: null,
          }) as any,
      );
      tournament.matches = [
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 1 },
          playerB: { id: 3 },
          winner: { id: 1 },
          playerAScore: 2,
          playerBScore: 0,
        } as any,
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 2 },
          playerB: { id: 4 },
          winner: { id: 2 },
          playerAScore: 2,
          playerBScore: 0,
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      const manager = {
        findOne: jest.fn().mockResolvedValue(tournament),
        save: jest.fn(),
        find: jest.fn(),
        create: jest.fn((_entity, data) => data),
        update: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      const result = await service.advanceToNextRound(1);

      expect(result.newRound).toBe(2);
      expect(result.matchesCreated).toBe(2);
      expect(mockMatchService.create).toHaveBeenCalledTimes(2);

      // The two winners face each other, and so do the two losers.
      const created = mockMatchService.create.mock.calls.map(([dto]: any) =>
        [dto.playerAId, dto.playerBId].sort((a: number, b: number) => a - b),
      );
      expect(created).toContainEqual([1, 2]);
      expect(created).toContainEqual([3, 4]);
    });

    it("keeps dropped players out of the swiss pairings", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.SWISS_SYSTEM;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 1;
      tournament.totalRounds = 3;
      tournament.registrations = [1, 2, 3, 4].map(
        (id) =>
          ({
            status: RegistrationStatus.CONFIRMED,
            player: { id },
            droppedAt: id === 4 ? new Date() : null,
          }) as any,
      );
      tournament.matches = [
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 1 },
          playerB: { id: 3 },
          winner: { id: 1 },
          playerAScore: 2,
          playerBScore: 0,
        } as any,
        {
          round: 1,
          status: MatchStatus.FINISHED,
          playerA: { id: 2 },
          playerB: { id: 4 },
          winner: { id: 2 },
          playerAScore: 2,
          playerBScore: 0,
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      const createdByes: any[] = [];
      const manager = {
        findOne: jest.fn().mockResolvedValue(tournament),
        save: jest.fn(),
        find: jest.fn(),
        create: jest.fn((_entity, data) => {
          createdByes.push(data);
          return data;
        }),
        update: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      await service.advanceToNextRound(1);

      const paired = mockMatchService.create.mock.calls.flatMap(
        ([dto]: any) => [dto.playerAId, dto.playerBId],
      );
      expect(paired).not.toContain(4);

      // Three players remain: a bye is written straight to the database.
      expect(createdByes).toHaveLength(1);
      expect(createdByes[0].isBye).toBe(true);
      expect(createdByes[0].status).toBe(MatchStatus.FINISHED);
    });

    it("finishes a round robin once the last round is played", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.ROUND_ROBIN;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 3;
      tournament.totalRounds = 3;
      tournament.registrations = [];
      tournament.matches = [
        {
          round: 3,
          status: MatchStatus.FINISHED,
          playerA: { id: 1 },
          playerB: { id: 2 },
        } as any,
      ];

      mockTournamentRepository.findOne.mockResolvedValue(tournament);
      const manager = {
        findOne: jest.fn().mockResolvedValue(tournament),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      const result = await service.advanceToNextRound(1);

      expect(result.newRound).toBe(4);
      expect(tournament.status).toBe(TournamentStatus.FINISHED);
      expect(tournament.isFinished).toBe(true);
    });
  });

  describe("finishTournament", () => {
    it("marks tournament finished and saves eliminations", async () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.ROUND_ROBIN;
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.currentRound = 2;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          save: jest.fn().mockImplementation((value) => value),
          find: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
          transaction: mockDataSource.transaction,
        }),
      );

      await service.finishTournament(1);
      expect(mockRankingService.updateTournamentRankings).toHaveBeenCalledWith(
        1,
      );
    });

    it("does not finish a single-elimination tournament before its final", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.IN_PROGRESS;
      tournament.totalRounds = 2;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          find: jest.fn().mockResolvedValue([]),
          save: jest.fn(),
        }),
      );

      await expect(service.finishTournament(1)).rejects.toThrow(
        "après une finale validée",
      );
      expect(
        mockRankingService.updateTournamentRankings,
      ).not.toHaveBeenCalled();
    });
  });

  describe("cancelTournament", () => {
    it("throws if tournament missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.cancelTournament(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("cancels when not finished", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.DRAFT;
      tournament.additionalInfo = "Informations conservées";
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);

      const manager = {
        findOne: mockTournamentRepository.findOne,
        update: jest.fn(),
        save: jest.fn().mockImplementation((value) => value),
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb(manager),
      );

      const result = await service.cancelTournament(1, "bad weather");

      expect(manager.update).toHaveBeenCalledWith(
        Match,
        expect.objectContaining({
          tournament: { id: 1 },
          status: expect.anything(),
        }),
        { status: MatchStatus.CANCELLED },
      );
      expect(result.additionalInfo).toContain("Informations conservées");
      expect(result.additionalInfo).toContain("Annulé: bad weather");
    });

    it("throws when trying to cancel a finished tournament", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.FINISHED;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);

      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          update: jest.fn(),
          save: jest.fn(),
        }),
      );

      await expect(service.cancelTournament(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws when the tournament is already cancelled", async () => {
      const tournament = baseTournament();
      tournament.status = TournamentStatus.CANCELLED;
      mockTournamentRepository.findOne.mockResolvedValueOnce(tournament);

      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: mockTournamentRepository.findOne,
          update: jest.fn(),
          save: jest.fn(),
        }),
      );

      await expect(service.cancelTournament(1)).rejects.toThrow("déjà annulé");
    });
  });

  describe("getTournamentProgress", () => {
    it("returns live stats", async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 2,
        matches: [
          { status: MatchStatus.FINISHED },
          { status: MatchStatus.SCHEDULED },
        ] as any,
        registrations: [
          { status: RegistrationStatus.CONFIRMED, eliminatedAt: null },
          { status: RegistrationStatus.CONFIRMED, eliminatedAt: new Date() },
        ],
      } as Tournament);

      const progress = await service.getTournamentProgress(1);
      expect(progress.completedMatches).toBe(1);
      expect(progress.totalMatches).toBe(2);
      expect(progress.progressPercentage).toBeGreaterThan(0);
    });

    it("uses the complete elimination bracket size for progress with byes", async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        id: 1,
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 3,
        matches: Array.from({ length: 4 }, (_, index) => ({
          status: index < 2 ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
        })) as Match[],
        registrations: Array.from({ length: 6 }, () => ({
          status: RegistrationStatus.CONFIRMED,
          eliminatedAt: null,
        })) as unknown as TournamentRegistration[],
      } as Tournament);

      const progress = await service.getTournamentProgress(1);

      expect(progress.totalMatches).toBe(7);
      expect(progress.completedMatches).toBe(2);
      expect(progress.progressPercentage).toBeCloseTo(28.57, 1);
    });
  });

  describe("private helpers", () => {
    it("detects tournament completion for elimination", () => {
      const tournament = baseTournament();
      tournament.type = TournamentType.SINGLE_ELIMINATION;
      tournament.registrations = [
        { status: RegistrationStatus.CONFIRMED, eliminatedAt: null },
        { status: RegistrationStatus.CONFIRMED, eliminatedAt: new Date() },
      ] as any;
      const done = (service as any).isTournamentComplete(tournament, 2);
      expect(done).toBe(true);
    });

    it("computes phase for round", () => {
      const phase = (service as any).getPhaseForRound(2, 3);
      expect(phase).toBe(MatchPhase.SEMI_FINAL);
    });
  });
});
