import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";
import { CreateDeckDto } from "./create-deck.dto";

export class DeckCardDto {
  @ApiProperty({ description: "Card UUID to add", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })
  @IsUUID()
  cardId: string;

  @ApiProperty({ description: "Quantity to add", example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  qty: number;

  @ApiProperty({ description: "Card role", example: "main" })
  @IsString()
  role: string;
}

export class UpdateCardDto {
  @ApiProperty({ description: "DeckCard association ID", example: 10 })
  @IsNumber()
  id: number;

  @ApiPropertyOptional({ description: "New quantity", example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;

  @ApiPropertyOptional({ enum: DeckCardRole, description: "New card role" })
  @IsOptional()
  @IsString()
  role?: DeckCardRole;
}

export class DeckCardDeleteDto {
  @ApiProperty({ description: "DeckCard association ID to delete", example: 10 })
  @IsInt()
  id: number;
}

/**
 * Payload for updating an existing user deck.
 */
export class UpdateDeckDto extends PartialType(CreateDeckDto) {
  @ApiPropertyOptional({
    description: "Cards to add to the deck",
    type: [DeckCardDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckCardDto)
  cardsToAdd?: DeckCardDto[];

  @ApiPropertyOptional({
    description: "Deck card association IDs to remove from the deck",
    type: [DeckCardDeleteDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckCardDeleteDto)
  cardsToRemove?: DeckCardDeleteDto[];

  @ApiPropertyOptional({
    description: "Deck card associations to update in the deck",
    type: [UpdateCardDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCardDto)
  cardsToUpdate?: UpdateCardDto[];
}
