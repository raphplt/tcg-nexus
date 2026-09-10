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
import { Languages } from "../../common/enums/languages";
import { ListingStatus } from "../../common/enums/listing-status";
import { ProductKind } from "../../common/enums/product-kind";

/**
 * Whitelist keys mapped internally on service side, never interpolated into raw SQL.
 */
export enum ListingSortBy {
  CREATED_AT = "createdAt",
  PRICE = "price",
  EXPIRES_AT = "expiresAt",
  QUANTITY_AVAILABLE = "quantityAvailable",
  NAME = "name",
}

export enum ListingSortOrder {
  ASC = "ASC",
  DESC = "DESC",
}

/**
 * Query filter parameters for searching and paginating marketplace listings.
 */
export class FindAllListingsQuery {
  @ApiPropertyOptional({
    description: "Search term matching card or sealed product title",
    example: "Charizard",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Card physical condition code (e.g. NM, EX, GD, LP, PL, PO)",
    example: "NM",
  })
  @IsOptional()
  @IsString()
  cardState?: string;

  @ApiPropertyOptional({
    description: "Printed language of the listing",
    enum: Languages,
  })
  @IsOptional()
  @IsEnum(Languages)
  language?: Languages;

  @ApiPropertyOptional({
    description: "Status filter for listings",
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({
    description: "Currency filter",
    example: "EUR",
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Minimum price boundary",
    example: 1.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiPropertyOptional({
    description: "Maximum price boundary",
    example: 250.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiPropertyOptional({
    description: "Filter by seller unique identifier",
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sellerId?: number;

  @ApiPropertyOptional({
    description: "Filter by single Pokémon card identifier",
    example: "base1-4",
  })
  @IsOptional()
  @IsString()
  pokemonCardId?: string;

  @ApiPropertyOptional({
    description: "Filter by sealed product identifier",
    example: "sealed-etb-151",
  })
  @IsOptional()
  @IsString()
  sealedProductId?: string;

  @ApiPropertyOptional({
    description: "Filter by product category (card or sealed product)",
    enum: ProductKind,
  })
  @IsOptional()
  @IsEnum(ProductKind)
  productKind?: ProductKind;

  @ApiPropertyOptional({
    description: "Page index for pagination",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Maximum listings per page",
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Sort column",
    enum: ListingSortBy,
    default: ListingSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(ListingSortBy)
  sortBy?: ListingSortBy = ListingSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: "Sort order direction",
    enum: ListingSortOrder,
    default: ListingSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(ListingSortOrder)
  sortOrder?: ListingSortOrder = ListingSortOrder.DESC;
}
