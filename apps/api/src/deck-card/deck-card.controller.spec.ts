import { Test, TestingModule } from '@nestjs/testing';
import { DeckCardController } from './deck-card.controller';
import { DeckCardService } from './deck-card.service';

describe('DeckCardController', () => {
  let controller: DeckCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeckCardController],
      providers: [DeckCardService]
    }).compile();

    controller = module.get<DeckCardController>(DeckCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate creation to service', () => {
    const payload = { cardId: 'card-1', deckId: 2, quantity: 3 };
    const result = controller.create(payload as any);

    expect(result).toBe('This action adds a new deckCard');
  });

  it('should list all deck cards', () => {
    expect(controller.findAll()).toBe('This action returns all deckCard');
  });

  it('should get one deck card with numeric id', () => {
    expect(controller.findOne('4')).toBe('This action returns a #4 deckCard');
  });

  it('should update and remove deck cards', () => {
    expect(controller.update('9', { quantity: 1 } as any)).toBe(
      'This action updates a #9 deckCard'
    );
    expect(controller.remove('11')).toBe('This action removes a #11 deckCard');
  });
});
