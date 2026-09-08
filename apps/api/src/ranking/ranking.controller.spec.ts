import { Test, TestingModule } from "@nestjs/testing";
import { RankingController } from "./ranking.controller";
import { RankingService } from "./ranking.service";
import { User } from "../user/entities/user.entity";

describe("RankingController", () => {
  let controller: RankingController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getGlobalRanking: jest.fn(),
    getMyRankingPosition: jest.fn(),
    getEloForUser: jest.fn(),
    getRecentEloHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RankingController],
      providers: [{ provide: RankingService, useValue: service }],
    }).compile();

    controller = module.get<RankingController>(RankingController);
    jest.clearAllMocks();
  });

  it("should delegate basic CRUD to service", async () => {
    service.create.mockReturnValue("created");
    service.findAll.mockReturnValue("all");
    service.findOne.mockReturnValue("one");
    service.update.mockReturnValue("updated");
    service.remove.mockReturnValue("removed");

    expect(await controller.create({} as any)).toBe("created");
    expect(await controller.findAll()).toBe("all");
    expect(await controller.findOne("1")).toBe("one");
    expect(await controller.update("2", {} as any)).toBe("updated");
    expect(await controller.remove("3")).toBe("removed");
  });

  describe("getGlobalRanking", () => {
    it("should use default query parameters when omitted", async () => {
      service.getGlobalRanking.mockResolvedValue({ items: [], total: 0 });

      const result = await controller.getGlobalRanking();
      expect(result).toEqual({ items: [], total: 0 });
      expect(service.getGlobalRanking).toHaveBeenCalledWith(
        1,
        20,
        "all-time",
        undefined,
      );
    });

    it("should forward custom query parameters when provided", async () => {
      service.getGlobalRanking.mockResolvedValue({ items: ["p1"], total: 1 });

      const result = await controller.getGlobalRanking(
        2,
        50,
        "month",
        "standard",
      );
      expect(result).toEqual({ items: ["p1"], total: 1 });
      expect(service.getGlobalRanking).toHaveBeenCalledWith(
        2,
        50,
        "month",
        "standard",
      );
    });
  });

  describe("getMyRankingPosition", () => {
    const mockUser = { id: 42 } as User;

    it("should use default period when omitted", async () => {
      service.getMyRankingPosition.mockResolvedValue({ rank: 5 });

      const result = await controller.getMyRankingPosition(mockUser);
      expect(result).toEqual({ rank: 5 });
      expect(service.getMyRankingPosition).toHaveBeenCalledWith(
        42,
        "all-time",
        undefined,
      );
    });

    it("should forward specified period and format", async () => {
      service.getMyRankingPosition.mockResolvedValue({ rank: 3 });

      const result = await controller.getMyRankingPosition(
        mockUser,
        "season-1",
        "standard",
      );
      expect(result).toEqual({ rank: 3 });
      expect(service.getMyRankingPosition).toHaveBeenCalledWith(
        42,
        "season-1",
        "standard",
      );
    });
  });

  describe("getMyElo", () => {
    const mockUser = { id: 10 } as User;

    it("should map match history for win, loss, and draw accurately", async () => {
      service.getEloForUser.mockResolvedValue(1350);
      service.getRecentEloHistory.mockResolvedValue([
        // User won
        {
          id: "m-1",
          createdAt: new Date("2026-01-01"),
          delta: 16,
          winner: { id: 10 },
          loser: { id: 20 },
          winnerEloAfter: 1350,
          loserEloAfter: 1200,
        },
        // User lost
        {
          id: "m-2",
          createdAt: new Date("2026-01-02"),
          delta: 14,
          winner: { id: 30 },
          loser: { id: 10 },
          winnerEloAfter: 1400,
          loserEloAfter: 1334,
        },
        // Neither won nor lost (draw)
        {
          id: "m-3",
          createdAt: new Date("2026-01-03"),
          delta: 0,
          winner: null,
          loser: null,
          winnerEloAfter: 1334,
          loserEloAfter: 1334,
        },
      ]);

      const result = await controller.getMyElo(mockUser);
      expect(result.elo).toBe(1350);
      expect(result.history).toHaveLength(3);

      // Win entry
      expect(result.history[0]).toEqual({
        id: "m-1",
        createdAt: new Date("2026-01-01"),
        delta: 16,
        result: "win",
        opponentId: 20,
        eloAfter: 1350,
      });

      // Loss entry
      expect(result.history[1]).toEqual({
        id: "m-2",
        createdAt: new Date("2026-01-02"),
        delta: -14,
        result: "loss",
        opponentId: 30,
        eloAfter: 1334,
      });

      // Draw entry
      expect(result.history[2]).toEqual({
        id: "m-3",
        createdAt: new Date("2026-01-03"),
        delta: -0,
        result: "draw",
        opponentId: null,
        eloAfter: 1334,
      });
    });
  });
});
