import { Test, TestingModule } from "@nestjs/testing";
import { User } from "src/user/entities/user.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

describe("DashboardController", () => {
  let controller: DashboardController;

  const mockDashboardService = {
    getDashboard: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return dashboard statistics for current user", async () => {
    const user = { id: 1 } as User;
    const mockDashboardData = {
      collection: { totalCards: 10 },
    };
    mockDashboardService.getDashboard.mockResolvedValue(mockDashboardData);

    const result = await controller.getDashboard(user);
    expect(result).toEqual(mockDashboardData);
    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith(user);
  });
});
