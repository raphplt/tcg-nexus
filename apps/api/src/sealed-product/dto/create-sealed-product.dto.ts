import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { SealedProductType } from "../enums/sealed-product-type.enum";

export class SealedProductContentsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  boosterCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  promos?: string[];

  @IsOptional()
  @IsBoolean()
  accessories?: boolean;
}

export class SealedProductLocaleDto {
  @IsString()
  @IsNotEmpty()
  locale: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateSealedProductDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEnum(SealedProductType)
  productType: SealedProductType;

  @IsOptional()
  @IsString()
  pokemonSetId?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SealedProductContentsDto)
  contents?: SealedProductContentsDto;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  upc?: string;

  @IsOptional()
  @IsString()
  image?: string;

  /**
   * Localized names, at least one. The product carries no name of its own
   * since the multilingual switch, so an empty list would create a nameless
   * product.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SealedProductLocaleDto)
  locales: SealedProductLocaleDto[];
}
