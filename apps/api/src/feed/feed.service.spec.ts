import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Deck } from "../deck/entities/deck.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { UserFollowService } from "../user-follow/user-follow.service";
import { FeedService } from "./feed.service";

describe("FeedService", () => {
  let service: FeedService;

  const mockDeckRepo = {
    find: jest.fn(),
  };

  const mockRegRepo = {
    find: jest.fn(),
  };

  const mockFollowService = {
    getFollowedIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: getRepositoryToken(Deck),
          useValue: mockDeckRepo,
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: mockRegRepo,
        },
        {
          provide: UserFollowService,
          useValue: mockFollowService,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getFeedForUser", () => {
    it("should return empty feed if user follows no one", async () => {
      mockFollowService.getFollowedIds.mockResolvedValue([]);
      const result = await service.getFeedForUser(1);
      expect(result).toEqual([]);
    });

    it("should aggregate deck creations and tournament registrations sorted by date", async () => {
      mockFollowService.getFollowedIds.mockResolvedValue([2, 3]);

      const d1 = new Date("2026-01-02T10:00:00Z");
      const d2 = new Date("2026-01-01T10:00:00Z");

      mockDeckRepo.find.mockResolvedValue([
        {
          id: 10,
          name: "Lightning Deck",
          createdAt: d2,
          user: { id: 2, firstName: "Alice", lastName: "Smith" },
          format: { id: 1, type: "Standard" },
        },
      ]);

      mockRegRepo.find.mockResolvedValue([
        {
          id: 20,
          registeredAt: d1,
          player: {
            user: { id: 3, firstName: "Bob", lastName: "Jones" },
          },
          tournament: {
            id: 5,
            name: "Regional Cup",
            startDate: null,
            endDate: null,
          },
        },
      ]);

      const result = await service.getFeedForUser(1, 10);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("tournament_joined");
      expect(result[0].actor.firstName).toBe("Bob");
      expect(result[1].type).toBe("deck_created");
      expect(result[1].actor.firstName).toBe("Alice");
    });
  });
});
