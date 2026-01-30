import { Test, TestingModule } from '@nestjs/testing';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';

describe('DeckController', () => {
  let controller: DeckController;
  let service: jest.Mocked<DeckService>;

  const mockDeckService = () => ({
    createDeck: jest.fn(),
    findAll: jest.fn(),
    findAllFromUser: jest.fn(),
    findOneWithCards: jest.fn(),
    analyzeDeck: jest.fn(),
    updateDeck: jest.fn(),
    remove: jest.fn(),
    cloneDeck: jest.fn(),
    incrementViews: jest.fn(),
    shareDeck: jest.fn(),
    getDeckForImport: jest.fn(),
    importDeck: jest.fn()
  });

  beforeEach(async () => {
    const deckService = mockDeckService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckController],
      providers: [
        {
          provide: DeckService,
          useValue: deckService
        }
      ]
    }).compile();

    controller = module.get<DeckController>(DeckController);
    service = module.get(DeckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a deck', async () => {
    const dto = { deckName: 'Test' } as any;
    const user = { id: 1 } as any;
    service.createDeck.mockResolvedValue('created' as any);

    const result = await controller.create(user, dto);

    expect(service.createDeck).toHaveBeenCalledWith(user, dto);
    expect(result).toBe('created');
  });

  it('finds all decks', async () => {
    const query = { page: 2 } as any;
    service.findAll.mockResolvedValue(['deck'] as any);

    const result = await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(['deck']);
  });

  it('finds decks from the current user', async () => {
    const user = { id: 99 } as any;
    const query = { limit: 5 } as any;
    service.findAllFromUser.mockResolvedValue(['mine'] as any);

    const result = await controller.findAllFromUSer(user, query);

    expect(service.findAllFromUser).toHaveBeenCalledWith(user, query);
    expect(result).toEqual(['mine']);
  });

  it('finds one deck', async () => {
    service.findOneWithCards.mockResolvedValue({ id: 1 } as any);

    const result = await controller.findOne('1');

    expect(service.findOneWithCards).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  it('analyzes a deck', async () => {
    service.analyzeDeck.mockResolvedValue({ deckId: 2 } as any);

    const result = await controller.analyze('2');

    expect(service.analyzeDeck).toHaveBeenCalledWith(2);
    expect(result).toEqual({ deckId: 2 });
  });

  it('updates a deck', async () => {
    const dto = { deckName: 'New' } as any;
    const user = { id: 1 } as any;
    service.updateDeck.mockResolvedValue({ id: 3 } as any);

    const result = await controller.update('3', user, dto);

    expect(service.updateDeck).toHaveBeenCalledWith(3, user, dto);
    expect(result).toEqual({ id: 3 });
  });

  it('removes a deck', async () => {
    service.remove.mockResolvedValue({ message: 'ok' } as any);

    const result = await controller.remove('4');

    expect(service.remove).toHaveBeenCalledWith(4);
    expect(result).toEqual({ message: 'ok' });
  });

  it('clones a deck', async () => {
    const user = { id: 1 } as any;
    service.cloneDeck.mockResolvedValue({ id: 5 } as any);

    const result = await controller.clone('5', user);

    expect(service.cloneDeck).toHaveBeenCalledWith(5, user);
    expect(result).toEqual({ id: 5 });
  });

  it('increments views', async () => {
    service.incrementViews.mockResolvedValue({ message: 'incremented' } as any);

    const result = await controller.incrementView('6');

    expect(service.incrementViews).toHaveBeenCalledWith(6);
    expect(result).toEqual({ message: 'incremented' });
  });

  it('shares a deck', async () => {
    const user = { id: 1 } as any;
    const dto = { expiresAt: '2024-01-01' } as any;
    service.shareDeck.mockResolvedValue({ code: 'CODE1234' });

    const result = await controller.share('7', user, dto);

    expect(service.shareDeck).toHaveBeenCalledWith(7, user, dto);
    expect(result).toEqual({ code: 'CODE1234' });
  });

  it('gets a deck for import', async () => {
    service.getDeckForImport.mockResolvedValue({ id: 8 } as any);

    const result = await controller.getDeckForImport('abc');

    expect(service.getDeckForImport).toHaveBeenCalledWith('abc');
    expect(result).toEqual({ id: 8 });
  });

  it('imports a deck from a share code', async () => {
    const user = { id: 2 } as any;
    service.importDeck.mockResolvedValue({ id: 9 } as any);

    const result = await controller.importDeck('xyz', user);

    expect(service.importDeck).toHaveBeenCalledWith('xyz', user);
    expect(result).toEqual({ id: 9 });
  });
});
