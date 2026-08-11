import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { SUPPORTED_LOCALES } from "../supported-locales";

export class TranslationEntryDto {
  @IsIn(SUPPORTED_LOCALES)
  locale: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  key: string;

  @IsString()
  @MaxLength(5000)
  value: string;
}

export class UpsertTranslationsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TranslationEntryDto)
  entries: TranslationEntryDto[];
}
