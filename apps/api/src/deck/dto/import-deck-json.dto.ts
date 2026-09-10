import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";

/**
 * Card entry payload for JSON deck import.
 */
export class ImportDeckCardDto {
  @ApiProperty({ example: "swsh4-185", description: "Card catalog identifier" })
  @IsString()
  @IsNotEmpty()
  tcgDexId: string;

  @ApiProperty({ example: "Pokémon Center Lady", required: false, description: "Card name hint" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 2, description: "Quantity of this card" })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ enum: DeckCardRole, example: DeckCardRole.main, description: "Card role in deck" })
  @IsEnum(DeckCardRole)
  role: DeckCardRole;
}

/**
 * Payload for importing a complete deck from exported JSON.
 */
export class ImportDeckJsonDto {
  @ApiProperty({ example: "Competitive Lugia VSTAR", description: "Deck display name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Standard" })
  @IsString()
  @IsNotEmpty()
  format: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ type: [ImportDeckCardDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDeckCardDto)
  cards: ImportDeckCardDto[];
}
