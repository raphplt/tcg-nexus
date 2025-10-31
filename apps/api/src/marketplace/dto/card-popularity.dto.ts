import {
  IsEnum,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsInt,
  Min,
  IsBoolean
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CardEventType } from '../entities/card-event.entity';

export class CreateCardEventDto {
  @IsUUID()
  cardId: string;

  @IsEnum(CardEventType)
  eventType: CardEventType;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };
}

export class GetPopularCardsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class GetTrendingCardsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  excludePopular?: boolean;
}
