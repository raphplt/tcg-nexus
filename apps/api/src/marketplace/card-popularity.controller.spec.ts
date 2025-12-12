import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CardPopularityController } from './card-popularity.controller';
import { CardPopularityService } from './card-popularity.service';

describe('CardPopularityController', () => {
  let controller: CardPopularityController;
  const service = {
    recordEvent: jest.fn(),
    getPopularCards: jest.fn(),
    getTrendingCards: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardPopularityController],
      providers: [{ provide: CardPopularityService, useValue: service }]
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<CardPopularityController>(CardPopularityController);
    jest.clearAllMocks();
  });

  it('should record event and return success', async () => {
    service.recordEvent.mockResolvedValue(undefined);
    const res = await controller.recordEvent(
      { cardId: 'c1', eventType: 'VIEW' } as any,
      { id: 2 } as any,
      '127.0.0.1',
      { headers: { 'user-agent': 'test' } }
    );
    expect(service.recordEvent).toHaveBeenCalled();
    expect(res).toEqual({ success: true });
  });

  it('should get popular and trending cards', async () => {
    service.getPopularCards.mockResolvedValue([{ id: 1 }]);
    service.getTrendingCards.mockResolvedValue([{ id: 2 }]);

    await expect(
      controller.getPopularCards({ limit: 5 } as any)
    ).resolves.toEqual([{ id: 1 }]);
    await expect(
      controller.getTrendingCards({ limit: 3, excludePopular: true } as any)
    ).resolves.toEqual([{ id: 2 }]);
  });
});
