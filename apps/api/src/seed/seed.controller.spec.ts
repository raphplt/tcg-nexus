import { Test, TestingModule } from "@nestjs/testing";
import { SealedProductService } from "../sealed-product/sealed-product.service";
import { DemoService } from "./demo.service";
import { DemoRefreshService } from "./demo-refresh.service";
import { TournamentType } from "../tournament/entities/tournament.entity";
import { SeedingMethod } from "../tournament/services/seeding.service";
import { SeedController } from "./seed.controller";
import { SeedService } from "./seed.service";

describe("SeedController", () => {
  let controller: SeedController;
  const mockService = {
    enableExtensions: jest.fn(),
    seedUsers: jest.fn(),
    seedTournaments: jest.fn(),
    seedFaq: jest.fn(),
    importPokemon: jest.fn(),
    seedListings: jest.fn(),
    seedCardEvents: jest.fn(),
    seedCardPopularityMetrics: jest.fn(),
    seedCompleteTournament: jest.fn(),
  };
  const mockDemoService = {
    prepareDemo: jest.fn(),
    resetDemoTournament: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        { provide: DemoRefreshService, useValue: { refresh: jest.fn() } },
        {
          provide: SeedService,
          useValue: mockService,
        },
        {
          provide: SealedProductService,
          useValue: {
            seedFromJson: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DemoService,
          useValue: mockDemoService,
        },
      ],
    }).compile();

    controller = module.get<SeedController>(SeedController);
    jest.clearAllMocks();
  });

  it("should import catalog", () => {
    mockService.importPokemon.mockReturnValue("ok");
    expect(controller.importCatalog()).toBe("ok");
  });

  it("should seed all", async () => {
    mockService.seedUsers.mockResolvedValue(1);
    mockService.seedTournaments.mockResolvedValue(2);
    mockService.seedFaq.mockResolvedValue([]);
    mockService.importPokemon.mockResolvedValue(undefined);
    mockService.seedListings.mockResolvedValue(undefined);
    mockService.seedCardEvents.mockResolvedValue(undefined);
    mockService.seedCardPopularityMetrics.mockResolvedValue(undefined);

    await expect(controller.seedAll()).resolves.toEqual({
      users: 1,
      tournaments: 2,
      faqs: [],
    });
  });

  it("should seed complete tournament with params", async () => {
    mockService.seedCompleteTournament.mockResolvedValue({ id: 10 });
    await expect(
      controller.seedCompleteTournament(
        "Cup",
        "8",
        TournamentType.SWISS_SYSTEM,
        SeedingMethod.RANDOM,
      ),
    ).resolves.toEqual({ id: 10 });
    expect(mockService.seedCompleteTournament).toHaveBeenCalledWith(
      "Cup",
      8,
      TournamentType.SWISS_SYSTEM,
      SeedingMethod.RANDOM,
    );
  });

  it("should seed card events and popularity metrics", async () => {
    mockService.seedCardEvents.mockResolvedValue(undefined);
    mockService.seedCardPopularityMetrics.mockResolvedValue(undefined);

    await expect(controller.seedCardEvents()).resolves.toEqual({
      message: "Card events seeded successfully",
    });
    await expect(controller.seedCardPopularityMetrics()).resolves.toEqual({
      message: "Card popularity metrics seeded successfully",
    });
  });
});
