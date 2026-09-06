import { TournamentStatus } from "../entities/tournament.entity";
import { TournamentRoundClockService } from "./tournament-round-clock.service";

describe("TournamentRoundClockService", () => {
  let service: TournamentRoundClockService;
  let tournamentRepository: any;
  let snapshotService: any;
  let auditService: any;

  beforeEach(() => {
    tournamentRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    snapshotService = {
      lockSnapshotsForTournament: jest.fn().mockResolvedValue(4),
    };
    auditService = {
      record: jest.fn().mockResolvedValue({ id: 1 }),
    };

    service = new TournamentRoundClockService(
      tournamentRepository,
      snapshotService,
      auditService,
    );
  });

  describe("startRoundClock", () => {
    it("should start round 1 timer and lock tournament deck snapshots", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 1,
        status: TournamentStatus.REGISTRATION_CLOSED,
        currentRound: 0,
        roundDurationMinutes: 50,
      });

      const res = await service.startRoundClock(1, 1, 50);

      expect(res.roundStartedAt).toBeDefined();
      expect(res.roundDeadline).toBeDefined();
      expect(res.currentRound).toBe(1);
      expect(snapshotService.lockSnapshotsForTournament).toHaveBeenCalledWith(1);
    });
  });

  describe("pause and resume", () => {
    it("should freeze elapsed time on pause and resume extending deadline", async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000);
      const initialDeadline = new Date(Date.now() + 40 * 60 * 1000);

      const tournament = {
        id: 1,
        status: TournamentStatus.IN_PROGRESS,
        roundStartedAt: startTime,
        roundDeadline: initialDeadline,
        isRoundPaused: false,
        pausedAt: null as Date | null,
      };

      tournamentRepository.findOne.mockResolvedValue(tournament);

      // Pause
      const paused = await service.pauseRoundClock(1, "Judge inquiry");
      expect(paused.isRoundPaused).toBe(true);
      expect(paused.pausedAt).toBeDefined();

      // Resume
      tournament.pausedAt = new Date(Date.now() - 5 * 60 * 1000); // simulated 5 min pause
      const resumed = await service.resumeRoundClock(1);
      expect(resumed.isRoundPaused).toBe(false);
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.roundDeadline!.getTime()).toBeGreaterThan(initialDeadline.getTime());
    });
  });

  describe("extendRoundClock", () => {
    it("should add extension minutes to deadline", async () => {
      const deadline = new Date(Date.now() + 20 * 60 * 1000);
      tournamentRepository.findOne.mockResolvedValue({
        id: 1,
        roundDeadline: deadline,
        roundDurationMinutes: 50,
      });

      const res = await service.extendRoundClock(1, 5, "Dispute delay");
      expect(res.roundDeadline!.getTime()).toBe(deadline.getTime() + 5 * 60 * 1000);
      expect(res.roundDurationMinutes).toBe(55);
    });
  });
});
