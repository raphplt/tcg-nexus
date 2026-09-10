import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { CardEventType } from "../entities/card-event.entity";

/**
 * Data transfer object for reporting a card engagement event.
 */
export class CreateCardEventDto {
  @ApiProperty({
    description: "UUID of the Pokémon card",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  cardId: string;

  @ApiProperty({
    description: "Type of engagement event",
    enum: CardEventType,
    example: CardEventType.VIEW,
  })
  @IsEnum(CardEventType)
  eventType: CardEventType;

  @ApiPropertyOptional({
    description: "Anonymous or client session identifier",
    example: "sess_123456789",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description:
      "Optional contextual metadata (referrer, search query, listing ID)",
  })
  @IsOptional()
  @IsObject()
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };
}

/**
 * Query filter for retrieving top popular cards.
 */
export class GetPopularCardsQueryDto {
  @ApiPropertyOptional({
    description: "Maximum number of popular cards to retrieve",
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

/**
 * Query filter for retrieving trending cards.
 */
export class GetTrendingCardsQueryDto {
  @ApiPropertyOptional({
    description: "Maximum number of trending cards to retrieve",
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  limit?: number;

  @ApiPropertyOptional({
    description:
      "Whether to exclude already established all-time popular cards",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }): boolean => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return false;
  })
  excludePopular?: boolean;
}
