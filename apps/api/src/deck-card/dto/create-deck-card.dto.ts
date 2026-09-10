import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";

/**
 * Payload for adding or linking a card directly to a deck.
 */
export class CreateDeckCardDto {
  @ApiProperty({ description: "Target deck unique identifier", example: 1 })
  @IsInt()
  deckId: number;

  @ApiProperty({
    description: "Catalog card unique identifier",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsString()
  cardId: string;

  @ApiProperty({
    description: "Quantity of this card in the deck",
    example: 4,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiPropertyOptional({
    enum: DeckCardRole,
    description: "Role or section of the card in the deck",
    example: DeckCardRole.main,
  })
  @IsOptional()
  @IsEnum(DeckCardRole)
  role?: DeckCardRole;
}
