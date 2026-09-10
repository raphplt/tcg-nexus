import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "../../translation/supported-locales";

/**
 * Payload for creating a new Pokémon card series.
 */
export class CreatePokemonSeryDto {
  @ApiProperty({ description: "Series unique identifier", example: "scarlet-violet" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Series display name", example: "Scarlet & Violet" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "Series logo image URL or path" })
  @IsOptional()
  @IsString()
  logo?: string;

  /** Language the name and logo apply to. Defaults to the fallback language. */
  @ApiPropertyOptional({
    description: "Language locale the name and logo apply to",
    enum: SUPPORTED_LOCALES,
    example: "en",
  })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: SupportedLocale;
}
