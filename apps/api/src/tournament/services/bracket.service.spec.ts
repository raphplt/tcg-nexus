import { BadRequestException } from "@nestjs/common";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";
import { Player } from "../../player/entities/player.entity";
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
import { SwissPairingService } from "./swiss-pairing.service";

const mockTournamentRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockMatchRepository = {
  create: jest.fn((value) => value),
  find: jest.fn(),
  save: jest.fn((value) => ({ id: 100, ...value })),
};

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
      mockSeedingService as any,
      new SwissPairingService(),
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

    it("returns persisted match status and scores in the public bracket", async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        ...buildTournament(TournamentType.SINGLE_ELIMINATION, []),
        totalRounds: 1,
        matches: [
          {
            id: 12,
            round: 1,
            phase: MatchPhase.FINAL,
            status: MatchStatus.FINISHED,
            playerAScore: 2,
            playerBScore: 1,
            playerA: basePlayer(1),
            playerB: basePlayer(2),
            winner: basePlayer(1),
            scheduledDate: new Date("2026-07-31T18:00:00Z"),
          },
        ],
      });

      const bracket = await service.getBracket(1);

      expect(bracket.rounds[0].matches[0]).toEqual(
        expect.objectContaining({
          matchId: 12,
          status: MatchStatus.FINISHED,
          playerAScore: 2,
          playerBScore: 1,
          winnerId: 1,
        }),
      );
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

    it.each([TournamentType.DOUBLE_ELIMINATION])(
      "rejects non-orchestrated format %s",
      async (type) => {
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
          buildTournament(type, regs),
        );
        await expect(service.generateBracket(1)).rejects.toThrow(
          "Ce format n'est pas encore orchestré par Nexus",
        );
      },
    );

    describe("round robin", () => {
      const confirmed = (count: number): TournamentRegistration[] =>
        Array.from(
          { length: count },
          (_, index) =>
            ({
              status: RegistrationStatus.CONFIRMED,
              checkedIn: true,
              player: basePlayer(index + 1),
            }) as any,
        );

      const pairKey = (a: number, b: number) =>
        [a, b].sort((x, y) => x - y).join("-");

      it("schedules every pairing exactly once with an even field", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.ROUND_ROBIN, confirmed(4)),
        );

        const bracket = await service.generateBracket(1);

        expect(bracket.type).toBe(TournamentType.ROUND_ROBIN);
        expect(bracket.totalRounds).toBe(3);
        expect(bracket.rounds).toHaveLength(3);

        const pairings = bracket.rounds.flatMap((round) =>
          round.matches.map((match) =>
            pairKey(match.playerA!.id, match.playerB!.id),
          ),
        );

        expect(pairings).toHaveLength(6);
        expect(new Set(pairings).size).toBe(6);
      });

      it("gives each player exactly one match per round", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.ROUND_ROBIN, confirmed(6)),
        );

        const bracket = await service.generateBracket(1);

        expect(bracket.totalRounds).toBe(5);
        for (const round of bracket.rounds) {
          const playerIds = round.matches.flatMap((match) =>
            [match.playerA?.id, match.playerB?.id].filter(Boolean),
          );
          expect(playerIds).toHaveLength(6);
          expect(new Set(playerIds).size).toBe(6);
        }
      });

      it("awards one bye per round when the field is odd", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.ROUND_ROBIN, confirmed(5)),
        );

        const bracket = await service.generateBracket(1);

        expect(bracket.totalRounds).toBe(5);

        const byPlayerByeCount = new Map<number, number>();
        for (const round of bracket.rounds) {
          const byes = round.matches.filter(
            (match) => !match.playerA || !match.playerB,
          );
          expect(byes).toHaveLength(1);

          const byePlayer = (byes[0].playerA ?? byes[0].playerB)!.id;
          byPlayerByeCount.set(
            byePlayer,
            (byPlayerByeCount.get(byePlayer) ?? 0) + 1,
          );
        }

        // Each player is given a bye exactly once across the tournament.
        expect(byPlayerByeCount.size).toBe(5);
        expect([...byPlayerByeCount.values()]).toEqual([1, 1, 1, 1, 1]);
      });

      it("persists byes as already finished matches", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.ROUND_ROBIN, confirmed(3)),
        );

        await service.generateBracket(1);

        const savedMatches = mockMatchRepository.save.mock.calls.map(
          ([match]) => match,
        );
        const byeMatches = savedMatches.filter(
          (match) => !match.playerA || !match.playerB,
        );

        expect(byeMatches).toHaveLength(3);
        for (const byeMatch of byeMatches) {
          expect(byeMatch.status).toBe(MatchStatus.FINISHED);
          expect(byeMatch.winner).toBeDefined();
        }
      });

      it("stores the round count on the tournament", async () => {
        const tournament = buildTournament(
          TournamentType.ROUND_ROBIN,
          confirmed(4),
        );
        mockTournamentRepository.findOne.mockResolvedValue(tournament);

        await service.generateBracket(1);

        expect(tournament.totalRounds).toBe(3);
        expect(tournament.currentRound).toBe(1);
        expect(mockTournamentRepository.save).toHaveBeenCalledWith(tournament);
      });
    });

    describe("swiss system", () => {
      const confirmed = (count: number): TournamentRegistration[] =>
        Array.from(
          { length: count },
          (_, index) =>
            ({
              status: RegistrationStatus.CONFIRMED,
              checkedIn: true,
              player: basePlayer(index + 1),
            }) as any,
        );

      it("only creates the opening round", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.SWISS_SYSTEM, confirmed(8)),
        );

        const bracket = await service.generateBracket(1);

        expect(bracket.type).toBe(TournamentType.SWISS_SYSTEM);
        expect(bracket.rounds).toHaveLength(1);
        expect(bracket.rounds[0].matches).toHaveLength(4);
      });

      it("sizes the tournament with the recommended round count", async () => {
        const tournament = buildTournament(
          TournamentType.SWISS_SYSTEM,
          confirmed(9),
        );
        tournament.maxPlayers = 16;
        mockTournamentRepository.findOne.mockResolvedValue(tournament);

        const bracket = await service.generateBracket(1);

        expect(bracket.totalRounds).toBe(4);
        expect(tournament.totalRounds).toBe(4);
      });

      it("crosses the top half of the seeding with the bottom half", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.SWISS_SYSTEM, confirmed(8)),
        );

        const bracket = await service.generateBracket(1);
        const pairings = bracket.rounds[0].matches.map((match) => [
          match.playerA!.id,
          match.playerB!.id,
        ]);

        expect(pairings).toEqual([
          [1, 5],
          [2, 6],
          [3, 7],
          [4, 8],
        ]);
      });

      it("awards a bye to the last seed on an odd field", async () => {
        mockTournamentRepository.findOne.mockResolvedValue(
          buildTournament(TournamentType.SWISS_SYSTEM, confirmed(5)),
        );

        const bracket = await service.generateBracket(1);
        const byes = bracket.rounds[0].matches.filter(
          (match) => !match.playerB,
        );

        expect(byes).toHaveLength(1);
        expect(byes[0].playerA!.id).toBe(3);

        const savedBye = mockMatchRepository.save.mock.calls
          .map(([match]) => match)
          .find((match) => !match.playerB);
        expect(savedBye.isBye).toBe(true);
        expect(savedBye.status).toBe(MatchStatus.FINISHED);
      });
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
  });
});
