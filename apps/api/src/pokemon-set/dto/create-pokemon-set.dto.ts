import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * Reference to a Pokémon series.
 */
export class SerieRefDto {
  @ApiProperty({
    description: "Series unique identifier",
    example: "scarlet-violet",
  })
  @IsString()
  id: string;
}

/**
 * Card counts breakdown for an expansion set.
 */
export class CardCountDto {
  @ApiPropertyOptional({
    description: "Total card count including secret rares",
    example: 198,
  })
  @IsOptional()
  @IsInt()
  total?: number;

  @ApiPropertyOptional({
    description: "Official numbered card count",
    example: 165,
  })
  @IsOptional()
  @IsInt()
  official?: number;

  @ApiPropertyOptional({
    description: "Reverse foil cards count",
    example: 150,
  })
  @IsOptional()
  @IsInt()
  reverse?: number;

  @ApiPropertyOptional({ description: "Holo cards count", example: 35 })
  @IsOptional()
  @IsInt()
  holo?: number;

  @ApiPropertyOptional({ description: "First edition cards count", example: 0 })
  @IsOptional()
  @IsInt()
  firstEd?: number;
}

/**
 * Tournament legality flags for an expansion set.
 */
export class LegalDto {
  @ApiPropertyOptional({
    description: "Standard format legality",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  standard?: boolean;

  @ApiPropertyOptional({
    description: "Expanded format legality",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  expanded?: boolean;
}

/**
 * Payload for creating a new Pokémon expansion set.
 */
export class CreatePokemonSetDto {
  @ApiProperty({
    description: "Expansion set unique identifier",
    example: "sv03",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Expansion set name",
    example: "Obsidian Flames",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Set logo URL or path",
    example: "https://assets.tcgdex.net/en/sv/sv03/logo",
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({
    description: "Set symbol URL or path",
    example: "https://assets.tcgdex.net/univ/sv/sv03/symbol",
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: "TCG Online / Live set code",
    example: "OBF",
  })
  @IsOptional()
  @IsString()
  tcgOnline?: string;

  @ApiPropertyOptional({
    description: "Release date string (YYYY-MM-DD)",
    example: "2023-08-11",
  })
  @IsOptional()
  @IsString()
  releaseDate?: string;

  @ApiPropertyOptional({
    description: "Parent series reference",
    type: () => SerieRefDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SerieRefDto)
  serie?: SerieRefDto;

  @ApiPropertyOptional({
    description: "Set card counts",
    type: () => CardCountDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardCountDto)
  cardCount?: CardCountDto;

  @ApiPropertyOptional({
    description: "Tournament format legality",
    type: () => LegalDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDto)
  legal?: LegalDto;
}
