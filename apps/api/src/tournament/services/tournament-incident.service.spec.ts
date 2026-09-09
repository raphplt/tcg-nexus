import { ConflictException } from "@nestjs/common";
import { MatchStatus } from "../../match/entities/match.entity";
import { TournamentIncidentService } from "./tournament-incident.service";
import { RegistrationStatus } from "../entities/tournament-registration.entity";
import { TournamentStatus } from "../entities/tournament.entity";
import { UserRole } from "../../common/enums/user";

describe("TournamentIncidentService", () => {
  const organizerUser = {
    id: 99,
    role: UserRole.USER,
    firstName: "Judge",
    lastName: "Dredd",
  } as never;

  let service: TournamentIncidentService;
  let tournamentRepository: any;
  let registrationRepository: any;
  let playerRepository: any;
  let matchRepository: any;
  let proposalRepository: any;
  let snapshotRepository: any;
  let organizerRepository: any;
  let matchService: any;
  let rankingService: any;
  let clockService: any;
  let swissPairingService: any;
  let auditService: any;

  beforeEach(() => {
    tournamentRepository = {
      findOne: jest.fn(),
    };
    registrationRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    playerRepository = {
      findOne: jest.fn(),
    };
    matchRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    proposalRepository = {};
    snapshotRepository = {
      findOne: jest.fn(),
    };
    organizerRepository = {
      findOne: jest.fn(),
    };
    matchService = {
      reportScore: jest.fn().mockResolvedValue({}),
    };
    rankingService = {
      getTournamentRankings: jest.fn().mockResolvedValue([]),
      updateTournamentRankings: jest.fn().mockResolvedValue([]),
      reverseMatchElo: jest.fn().mockResolvedValue(1),
    };
    clockService = {
      getRoundClockStatus: jest.fn().mockResolvedValue({
        currentRound: 1,
        remainingSeconds: 1200,
        isRoundPaused: false,
      }),
    };
    swissPairingService = {
      computeStandings: jest.fn().mockReturnValue([]),
    };
    auditService = {
      record: jest.fn().mockResolvedValue({ id: 1 }),
    };

    service = new TournamentIncidentService(
      tournamentRepository,
      registrationRepository,
      playerRepository,
      matchRepository,
      proposalRepository as any,
      snapshotRepository,
      organizerRepository,
      matchService,
      rankingService,
      clockService,
      swissPairingService,
      auditService,
    );
  });

  describe("dropPlayer", () => {
    it("should mark registration as dropped and forfeit active match", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 1,
        currentRound: 2,
      });
      playerRepository.findOne.mockResolvedValue({
        id: 10,
        user: { id: 50 },
      });
      registrationRepository.findOne.mockResolvedValue({
        id: 100,
        status: RegistrationStatus.CONFIRMED,
        droppedAt: null,
      });
      matchRepository.findOne.mockResolvedValue({
        id: 42,
        playerA: { id: 10 },
        playerB: { id: 20 },
      });

      const user = { id: 50, role: UserRole.USER } as any;
      const res = await service.dropPlayer(1, user, {
        reason: "Medical emergency",
      });

      expect(res.success).toBe(true);
      expect(registrationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RegistrationStatus.CANCELLED,
          droppedRound: 2,
        }),
      );
      expect(matchService.reportScore).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ isForfeit: true, playerBScore: 2 }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "DROP_PLAYER" }),
      );
    });
  });

  describe("applyScoreCorrection", () => {
    it("should allow organizer to correct a recorded score and recalculate standings", async () => {
      organizerRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
      matchRepository.findOne.mockResolvedValue({
        id: 42,
        playerA: { id: 1 },
        playerB: { id: 2 },
        playerAScore: 0,
        playerBScore: 2,
        winner: { id: 2 },
      });

      const res = await service.applyScoreCorrection(1, organizerUser, {
        matchId: 42,
        playerAScore: 2,
        playerBScore: 1,
        reason: "Inverted score slip corrected",
      });

      expect(res.match.playerAScore).toBe(2);
      expect(res.match.playerBScore).toBe(1);
      expect(rankingService.updateTournamentRankings).toHaveBeenCalledWith(1);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "CORRECT_TOURNAMENT_SCORE" }),
      );
    });
  });

    it("refuses a correction whose later matches are already played", async () => {
      organizerRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
      matchRepository.findOne.mockResolvedValue({
        id: 42,
        round: 1,
        playerA: { id: 1 },
        playerB: { id: 2 },
        tournament: { id: 10 },
        playerAScore: 2,
        playerBScore: 0,
      });
      matchRepository.find.mockResolvedValue([
        { id: 60, round: 2, status: MatchStatus.FINISHED },
      ]);

      await expect(
        service.applyScoreCorrection(10, organizerUser, {
          matchId: 42,
          playerAScore: 0,
          playerBScore: 2,
          reason: "Judge review",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(rankingService.reverseMatchElo).not.toHaveBeenCalled();
    });

    it("applies an acknowledged correction and reverses its rating", async () => {
      organizerRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
      matchRepository.findOne.mockResolvedValue({
        id: 42,
        round: 1,
        playerA: { id: 1 },
        playerB: { id: 2 },
        tournament: { id: 10 },
        playerAScore: 2,
        playerBScore: 0,
      });
      matchRepository.find.mockResolvedValue([
        { id: 60, round: 2, status: MatchStatus.FINISHED },
      ]);

      const result = await service.applyScoreCorrection(10, organizerUser, {
        matchId: 42,
        playerAScore: 0,
        playerBScore: 2,
        reason: "Judge review",
        acknowledgeDownstreamImpact: true,
      });

      expect(result.downstreamMatchIds).toEqual([60]);
      expect(rankingService.reverseMatchElo).toHaveBeenCalledWith(
        42,
        expect.stringContaining("Score correction"),
      );
      expect(rankingService.updateTournamentRankings).toHaveBeenCalledWith(10);
    });

  describe("getPlayerDashboard", () => {
    it("should return complete cockpit payload for registered participant", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 1,
        name: "Regional Championship",
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 5,
      });
      playerRepository.findOne.mockResolvedValue({ id: 10 });
      registrationRepository.findOne.mockResolvedValue({
        id: 100,
        status: RegistrationStatus.CONFIRMED,
        checkedIn: true,
      });
      snapshotRepository.findOne.mockResolvedValue({
        id: 1,
        deckName: "Miraidon",
        isValid: true,
        isLocked: true,
      });
      matchRepository.findOne.mockResolvedValue({
        id: 88,
        round: 1,
        tableNumber: 3,
        playerA: { id: 10 },
        playerB: { id: 20, user: { firstName: "Gary", lastName: "Oak" } },
        playerAScore: 0,
        playerBScore: 0,
        status: "in_progress",
        resultStatus: "unreported",
        proposals: [],
      });

      const dashboard = await service.getPlayerDashboard(1, 50);

      expect(dashboard.tournamentName).toBe("Regional Championship");
      expect(dashboard.deckStatus.isValid).toBe(true);
      expect(dashboard.activeMatch?.tableNumber).toBe(3);
      expect(dashboard.activeMatch?.opponentName).toBe("Gary Oak");
      expect(dashboard.nextAction).toBe("REPORT_SCORE");
    });
  });
});
