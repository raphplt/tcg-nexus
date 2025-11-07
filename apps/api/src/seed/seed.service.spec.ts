import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PokemonSerie } from '../pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from '../pokemon-set/entities/pokemon-set.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { User } from '../user/entities/user.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Ranking } from '../ranking/entities/ranking.entity';
import { Match } from '../match/entities/match.entity';
import { TournamentRegistration } from '../tournament/entities/tournament-registration.entity';
import { TournamentReward } from '../tournament/entities/tournament-reward.entity';
import { TournamentPricing } from '../tournament/entities/tournament-pricing.entity';
import { TournamentOrganizer } from '../tournament/entities/tournament-organizer.entity';
import { TournamentNotification } from '../tournament/entities/tournament-notification.entity';
import { Article } from '../article/entities/article.entity';
import { Listing } from '../marketplace/entities/listing.entity';
import { PriceHistory } from '../marketplace/entities/price-history.entity';
import { CardEvent } from '../marketplace/entities/card-event.entity';
import { CardPopularityMetrics } from '../marketplace/entities/card-popularity-metrics.entity';
import { Deck } from '../deck/entities/deck.entity';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { Collection } from '../collection/entities/collection.entity';
import { CardState } from '../card-state/entities/card-state.entity';
import { SeedingService } from '../tournament/services/seeding.service';
import { BracketService } from '../tournament/services/bracket.service';
import { MatchService } from '../match/match.service';

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

describe('SeedService', () => {
  let service: SeedService;

  const createMockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getRepositoryToken(PokemonSerie),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(PokemonSet),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Player),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Ranking),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Match),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(TournamentReward),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(TournamentPricing),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(TournamentOrganizer),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(TournamentNotification),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Article),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(CardEvent),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(CardPopularityMetrics),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(DeckCard),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(DeckFormat),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(Collection),
          useValue: createMockRepository()
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: createMockRepository()
        },
        {
          provide: SeedingService,
          useValue: {
            seedTournament: jest.fn()
          }
        },
        {
          provide: BracketService,
          useValue: {
            generateBracket: jest.fn()
          }
        },
        {
          provide: MatchService,
          useValue: {
            create: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
