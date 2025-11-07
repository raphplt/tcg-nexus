import { Test, TestingModule } from '@nestjs/testing';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

// Mock @faker-js/faker
jest.mock('@faker-js/faker', () => ({
  faker: {
    person: {
      firstName: jest.fn(() => 'Test'),
      lastName: jest.fn(() => 'User')
    },
    internet: {
      email: jest.fn(() => 'test@example.com')
    },
    datatype: {
      number: jest.fn(() => 1)
    },
    date: {
      recent: jest.fn(() => new Date())
    }
  }
}));

describe('SeedController', () => {
  let controller: SeedController;

  const mockSeedService = {
    seedAll: jest.fn(),
    seedPokemonData: jest.fn(),
    seedUsers: jest.fn(),
    seedTournaments: jest.fn(),
    seedMarketplace: jest.fn(),
    seedDecks: jest.fn(),
    seedCardStates: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [
        {
          provide: SeedService,
          useValue: mockSeedService
        }
      ]
    }).compile();

    controller = module.get<SeedController>(SeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
