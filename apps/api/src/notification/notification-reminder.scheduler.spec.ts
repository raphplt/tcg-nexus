import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Match, MatchStatus } from "../match/entities/match.entity";
import { NotificationReminderScheduler } from "./notification-reminder.scheduler";

describe("NotificationReminderScheduler", () => {
  let scheduler: NotificationReminderScheduler;
  const matchRepo = {
    createQueryBuilder: jest.fn(),
  };
  const emitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationReminderScheduler,
        { provide: getRepositoryToken(Match), useValue: matchRepo },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();
    scheduler = module.get<NotificationReminderScheduler>(
      NotificationReminderScheduler,
    );
  });

  it("emits tournament.match_reminder for each player of matches starting in ~24h", async () => {
    const matches = [
      {
        id: 11,
        tournament: { id: 5 },
        playerA: { user: { id: 1 } },
        playerB: { user: { id: 2 } },
      },
      {
        id: 12,
        tournament: { id: 5 },
        playerA: { user: { id: 3 } },
        playerB: null,
      },
    ];
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(matches),
    };
    matchRepo.createQueryBuilder.mockReturnValue(qb);

    await scheduler.handleDailyReminders();

    expect(emitter.emit).toHaveBeenCalledWith("tournament.match_reminder", {
      tournamentId: 5,
      matchId: 11,
      userId: 1,
    });
    expect(emitter.emit).toHaveBeenCalledWith("tournament.match_reminder", {
      tournamentId: 5,
      matchId: 11,
      userId: 2,
    });
    expect(emitter.emit).toHaveBeenCalledWith("tournament.match_reminder", {
      tournamentId: 5,
      matchId: 12,
      userId: 3,
    });
    expect(emitter.emit).toHaveBeenCalledTimes(3);
  });

  it("emits nothing when no matches found", async () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    matchRepo.createQueryBuilder.mockReturnValue(qb);

    await scheduler.handleDailyReminders();

    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
