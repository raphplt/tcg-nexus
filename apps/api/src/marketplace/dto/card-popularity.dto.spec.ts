import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import {
  CreateCardEventDto,
  GetPopularCardsQueryDto,
  GetTrendingCardsQueryDto
} from './card-popularity.dto';
import { CardEventType } from '../entities/card-event.entity';

describe('CardPopularity DTOs', () => {
  it('validates CreateCardEventDto', () => {
    const dto = plainToInstance(CreateCardEventDto, {
      cardId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: CardEventType.VIEW,
      context: { searchQuery: 'pikachu' }
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('validates popular cards query with min limit', () => {
    const dto = plainToInstance(GetPopularCardsQueryDto, { limit: 5 });
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('transforms trending cards query params', () => {
    const dto = plainToInstance(GetTrendingCardsQueryDto, {
      limit: '3',
      excludePopular: 'true'
    });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.limit).toBe(3);
    expect(dto.excludePopular).toBe(true);
  });
});
