import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";

/**
 * Input entry for a single card in a deck creation request.
 */
export class DeckCardInputDto {
  @ApiProperty({
    description: "Catalog card UUID",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsUUID()
  cardId: string;

  @ApiProperty({ description: "Card quantity in deck", example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({
    enum: DeckCardRole,
    description: "Deck card role (main, sideboard, etc.)",
    example: DeckCardRole.main,
  })
  @IsEnum(DeckCardRole)
  role: DeckCardRole;
}

/**
 * Payload for creating a new user deck.
 */
export class CreateDeckDto {
  @ApiProperty({ description: "Deck name", example: "Miraidon ex Turbo" })
  @IsString()
  @IsNotEmpty()
  deckName: string;

  @ApiProperty({
    description: "Whether the deck is publicly accessible",
    default: true,
  })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: "Deck format ID", example: 1 })
  @IsInt()
  formatId: number;

  @ApiProperty({
    description: "List of card entries contained in the deck",
    type: [DeckCardInputDto],
  })
  @ValidateNested({ each: true })
  @Type(() => DeckCardInputDto)
  cards: DeckCardInputDto[];
}
