import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { SealedProductType } from "../enums/sealed-product-type.enum";

export enum SealedSortBy {
  RECENT = "recent",
  POPULARITY = "popularity",
  PRICE_ASC = "priceAsc",
  PRICE_DESC = "priceDesc",
  NAME = "name",
}

export class SealedProductFilterDto {
  @IsOptional()
  @IsString()
  setId?: string;

  @IsOptional()
  @IsString()
  seriesId?: string;

  @IsOptional()
  @IsEnum(SealedProductType)
  productType?: SealedProductType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsEnum(SealedSortBy)
  sortBy?: SealedSortBy;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
