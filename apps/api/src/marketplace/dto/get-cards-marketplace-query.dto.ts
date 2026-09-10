import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum SortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

/**
 * Query DTO for retrieving catalog cards enriched with live marketplace pricing and listing volume.
 */
export class GetCardsWithMarketplaceQueryDto {
  @ApiPropertyOptional({
    description: "Page number for pagination",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Number of cards per page",
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Text search matching card name or local identifier",
    example: "Charizard",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter cards by specific set identifier",
    example: "base1",
  })
  @IsOptional()
  @IsString()
  setId?: string;

  @ApiPropertyOptional({
    description: "Filter cards by series identifier",
    example: "base",
  })
  @IsOptional()
  @IsString()
  serieId?: string;

  @ApiPropertyOptional({
    description: "Filter cards by rarity level",
    example: "Rare Holo",
  })
  @IsOptional()
  @IsString()
  rarity?: string;

  @ApiPropertyOptional({
    description: "Currency code filter for pricing metrics",
    example: "EUR",
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Card physical condition code (e.g. NM, EX, GD, LP, PL, PO)",
    example: "NM",
  })
  @IsOptional()
  @IsString()
  cardState?: string;

  @ApiPropertyOptional({
    description: "Minimum unit price filter",
    example: 5.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional({
    description: "Maximum unit price filter",
    example: 100.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({
    description: "Sort column (e.g. localId, name, price, listingCount)",
    default: "localId",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "localId";

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: SortOrder,
    default: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: "ASC" | "DESC" = "ASC";
}
