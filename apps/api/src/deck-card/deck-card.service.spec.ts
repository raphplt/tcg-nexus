import { Test, TestingModule } from '@nestjs/testing';
import { DeckCardService } from './deck-card.service';

describe('DeckCardService', () => {
  let service: DeckCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeckCardService]
    }).compile();

    service = module.get<DeckCardService>(DeckCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a deck card with message', () => {
    expect(
      service.create({ cardId: '123', deckId: 1, quantity: 2 })
    ).toContain('adds a new deckCard');
  });

  it('should return all deck cards message', () => {
    expect(service.findAll()).toBe('This action returns all deckCard');
  });

  it('should return single deck card message', () => {
    expect(service.findOne(5)).toBe('This action returns a #5 deckCard');
  });

  it('should update and remove deck cards with proper ids', () => {
    expect(service.update(7, { quantity: 3 })).toBe(
      'This action updates a #7 deckCard'
    );
    expect(service.remove(8)).toBe('This action removes a #8 deckCard');
  });
});
