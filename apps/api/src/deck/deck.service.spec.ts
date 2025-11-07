import { Test, TestingModule } from '@nestjs/testing';
import { DeckService } from './deck.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { Deck } from './entities/deck.entity';
import { Repository } from 'typeorm';

describe('DeckService', () => {
  let service: DeckService;

  const mockDeckCardRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn()
  };

  const mockPokemonCardRepo = {
    findOneBy: jest.fn()
  };

  const mockDeckFormatRepo = {
    findOneBy: jest.fn()
  };

  const mockDeckRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawAndMany: jest.fn()
    }))
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeckService,
        {
          provide: getRepositoryToken(DeckCard),
          useValue: mockDeckCardRepo
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: mockPokemonCardRepo
        },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: mockDeckFormatRepo
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: mockDeckRepo
        }
      ]
    }).compile();

    service = module.get<DeckService>(DeckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
