import { Type } from "class-transformer";
import {
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

  @IsString()
  @IsNotEmpty()
  nameEn: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SealedProductLocaleDto)
  locales?: SealedProductLocaleDto[];
}
