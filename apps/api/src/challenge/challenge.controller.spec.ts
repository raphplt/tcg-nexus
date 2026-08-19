import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../user/entities/user.entity";
import { ChallengeController } from "./challenge.controller";
import { ChallengeService } from "./challenge.service";

describe("ChallengeController", () => {
  let controller: ChallengeController;

  const mockChallengeService = {
    getActiveChallenges: jest.fn(),
    claimChallenge: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        {
          provide: ChallengeService,
          useValue: mockChallengeService,
        },
      ],
    }).compile();

    controller = module.get<ChallengeController>(ChallengeController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should get active challenges for current user", async () => {
    const user = { id: 1 } as User;
    mockChallengeService.getActiveChallenges.mockResolvedValue({ daily: [], weekly: [] });

    const result = await controller.getActiveChallenges(user);
    expect(result).toEqual({ daily: [], weekly: [] });
    expect(mockChallengeService.getActiveChallenges).toHaveBeenCalledWith(1);
  });

  it("should claim challenge reward", async () => {
    const user = { id: 1 } as User;
    mockChallengeService.claimChallenge.mockResolvedValue({ success: true, reward: 100 });

    const result = await controller.claimChallengeReward("5", user);
    expect(result).toEqual({ success: true, reward: 100 });
    expect(mockChallengeService.claimChallenge).toHaveBeenCalledWith(5, 1);
  });
});
