import { IsIn, IsOptional, IsString } from "class-validator";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "src/translation/supported-locales";

export class CreatePokemonSeryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  /** Language the name and logo apply to. Defaults to the fallback language. */
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: SupportedLocale;
}
