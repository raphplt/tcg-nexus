import { Test, TestingModule } from '@nestjs/testing';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

describe('SeedController', () => {
  let controller: SeedController;
  const mockService = {
    importPokemonSeries: jest.fn(),
    seedUsers: jest.fn(),
    seedTournaments: jest.fn(),
    importPokemon: jest.fn(),
    seedListings: jest.fn(),
    seedCardEvents: jest.fn(),
    seedCardPopularityMetrics: jest.fn(),
    seedCompleteTournament: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        {
          provide: SeedService,
          useValue: mockService
        }
      ]
    }).compile();

    controller = module.get<SeedController>(SeedController);
    jest.clearAllMocks();
  });

  it('should import series', () => {
    mockService.importPokemonSeries.mockReturnValue('ok');
    expect(controller.importSeries()).toBe('ok');
  });

  it('should seed all', async () => {
    mockService.seedUsers.mockResolvedValue(1);
    mockService.seedTournaments.mockResolvedValue(2);
    mockService.importPokemon.mockResolvedValue(undefined);
    mockService.seedListings.mockResolvedValue(undefined);
    mockService.seedCardEvents.mockResolvedValue(undefined);
    mockService.seedCardPopularityMetrics.mockResolvedValue(undefined);

    await expect(controller.seedAll()).resolves.toEqual({
      users: 1,
      tournaments: 2
    });
  });

  it('should seed complete tournament with params', async () => {
    mockService.seedCompleteTournament.mockResolvedValue({ id: 10 });
    await expect(
      controller.seedCompleteTournament('Cup', '8', 'SWISS' as any, 'RANDOM' as any)
    ).resolves.toEqual({ id: 10 });
    expect(mockService.seedCompleteTournament).toHaveBeenCalledWith(
      'Cup',
      8,
      'SWISS',
      'RANDOM'
    );
  });

  it('should seed card events and popularity metrics', async () => {
    mockService.seedCardEvents.mockResolvedValue(undefined);
    mockService.seedCardPopularityMetrics.mockResolvedValue(undefined);

    await expect(controller.seedCardEvents()).resolves.toEqual({
      message: 'Card events seeded successfully'
    });
    await expect(controller.seedCardPopularityMetrics()).resolves.toEqual({
      message: 'Card popularity metrics seeded successfully'
    });
  });
});
