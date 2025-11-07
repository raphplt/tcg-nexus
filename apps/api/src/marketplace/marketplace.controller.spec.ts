import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { PriceHistory } from './entities/price-history.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Order } from './entities/order.entity';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;

  const mockMarketplaceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [
        {
          provide: MarketplaceService,
          useValue: mockMarketplaceService
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: {}
        },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: {}
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: {}
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<MarketplaceController>(MarketplaceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
