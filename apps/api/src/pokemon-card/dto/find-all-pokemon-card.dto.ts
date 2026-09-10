import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

/**
 * Query parameters for filtering and paginating Pokémon cards.
 */
export class FindAllPokemonCardDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Search keyword matching name or text",
    example: "Charizard",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Expansion set identifier",
    example: "sv03",
  })
  @IsOptional()
  @IsString()
  setId?: string;

  @ApiPropertyOptional({
    description: "Series identifier",
    example: "scarlet-violet",
  })
  @IsOptional()
  @IsString()
  serieId?: string;

  @ApiPropertyOptional({
    description: "Card rarity filter",
    example: "Illustration Rare",
  })
  @IsOptional()
  @IsString()
  rarity?: string;

  @ApiPropertyOptional({
    description: "Card category or energy type",
    example: "Fire",
  })
  @IsOptional()
  @IsString()
  type?: string;
}
