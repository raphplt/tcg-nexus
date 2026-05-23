import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../user/entities/user.entity";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

describe("FeedController", () => {
  let controller: FeedController;

  const mockFeedService = {
    getFeedForUser: jest.fn(),
  };

  const currentUser = { id: 42 } as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [{ provide: FeedService, useValue: mockFeedService }],
    }).compile();
    controller = module.get<FeedController>(FeedController);
  });

  it("getFeed delegates to FeedService with default limit 30", async () => {
    mockFeedService.getFeedForUser.mockResolvedValue([]);
    await expect(controller.getFeed(currentUser)).resolves.toEqual([]);
    expect(mockFeedService.getFeedForUser).toHaveBeenCalledWith(42, 30);
  });

  it("getFeed forwards custom limit", async () => {
    mockFeedService.getFeedForUser.mockResolvedValue([]);
    await controller.getFeed(currentUser, 10);
    expect(mockFeedService.getFeedForUser).toHaveBeenCalledWith(42, 10);
  });
});
