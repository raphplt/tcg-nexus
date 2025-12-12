import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Listing } from '../marketplace/entities/listing.entity';
import { User } from '../user/entities/user.entity';

const createMockRepo = () => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([])
  };
  return {
    qb,
    repo: {
      createQueryBuilder: jest.fn(() => qb),
      find: jest.fn()
    }
  };
};

describe('SearchService', () => {
  let service: SearchService;
  let cardMock: ReturnType<typeof createMockRepo>;
  let tournamentMock: ReturnType<typeof createMockRepo>;
  let playerMock: ReturnType<typeof createMockRepo>;
  let listingMock: ReturnType<typeof createMockRepo>;
  let userMock: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    cardMock = createMockRepo();
    tournamentMock = createMockRepo();
    playerMock = createMockRepo();
    listingMock = createMockRepo();
    userMock = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(PokemonCard), useValue: cardMock.repo },
        {
          provide: getRepositoryToken(Tournament),
          useValue: tournamentMock.repo
        },
        { provide: getRepositoryToken(Player), useValue: playerMock.repo },
        { provide: getRepositoryToken(Listing), useValue: listingMock.repo },
        { provide: getRepositoryToken(User), useValue: userMock.repo }
      ]
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should return empty results when query too short', async () => {
    const res = await service.globalSearch({ query: 'a' } as any);
    expect(res.total).toBe(0);
  });

  it('should search multiple categories', async () => {
    cardMock.qb.getMany.mockResolvedValue([{ id: 'c1', name: 'Pika' }]);
    tournamentMock.qb.getMany.mockResolvedValue([{ id: 1, name: 'Cup' }]);
    playerMock.qb.getMany.mockResolvedValue([{ id: 2, nickname: 'Ash' }]);
    listingMock.qb.getMany.mockResolvedValue([
      {
        id: 3,
        title: 'Card',
        price: 10,
        currency: 'EUR',
        cardState: 'Mint',
        quantityAvailable: 1,
        pokemonCard: { name: 'Pikachu', image: 'img.png' },
        seller: { firstName: 'John', lastName: 'Doe' }
      }
    ]);

    const res = await service.globalSearch({ query: 'pi', limit: 5 } as any);
    expect(res.results.length).toBeGreaterThan(0);
  });
});
