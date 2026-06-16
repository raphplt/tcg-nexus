import { Test, TestingModule } from "@nestjs/testing";
import { BadgeController } from "./badge.controller";
import { BadgeService } from "./badge.service";

describe("BadgeController", () => {
  let controller: BadgeController;

  const mockBadgeService = {
    getUserBadges: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgeController],
      providers: [
        { provide: BadgeService, useValue: mockBadgeService },
      ],
    }).compile();
    controller = module.get<BadgeController>(BadgeController);
  });

  it("getUserBadges delegates to BadgeService.getUserBadges", async () => {
    mockBadgeService.getUserBadges.mockResolvedValue([{ id: 1 }]);
    await expect(controller.getUserBadges(42)).resolves.toEqual([{ id: 1 }]);
    expect(mockBadgeService.getUserBadges).toHaveBeenCalledWith(42);
  });
});
