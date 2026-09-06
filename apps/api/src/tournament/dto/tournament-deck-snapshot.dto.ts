import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SubmittedCardItemDto {
  @ApiProperty({ description: "Card identifier (e.g. base1-4)" })
  @IsNotEmpty()
  @IsString()
  cardId: string;

  @ApiProperty({ description: "Card name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Quantity in deck", example: 4 })
  @IsInt()
  quantity: number;

  @ApiPropertyOptional({ description: "Card role (main, energy, trainer)" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "Card supertype" })
  @IsOptional()
  @IsString()
  supertype?: string;

  @ApiPropertyOptional({ description: "Set code" })
  @IsOptional()
  @IsString()
  setCode?: string;
}

export class SubmitTournamentDeckDto {
  @ApiPropertyOptional({
    description: "User deck ID to snapshot (if existing)",
  })
  @IsOptional()
  @IsInt()
  deckId?: number;

  @ApiPropertyOptional({ description: "Custom submitted deck name" })
  @IsOptional()
  @IsString()
  deckName?: string;

  @ApiPropertyOptional({ description: "Game format identifier" })
  @IsOptional()
  @IsString()
  formatId?: string;

  @ApiPropertyOptional({ description: "Rule version applied" })
  @IsOptional()
  @IsString()
  ruleVersion?: string;

  @ApiPropertyOptional({
    description: "Submitted cards list",
    type: [SubmittedCardItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedCardItemDto)
  cards?: SubmittedCardItemDto[];
}

export class TournamentDeckSnapshotResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  tournamentId: number;

  @ApiProperty()
  playerId: number;

  @ApiPropertyOptional()
  userId?: number;

  @ApiPropertyOptional()
  playerName?: string;

  @ApiPropertyOptional()
  deckId?: number | null;

  @ApiProperty()
  deckName: string;

  @ApiPropertyOptional()
  formatId?: string;

  @ApiProperty()
  ruleVersion: string;

  @ApiProperty({ type: [SubmittedCardItemDto] })
  cardsSnapshot: SubmittedCardItemDto[];

  @ApiProperty({ type: [SubmittedCardItemDto] })
  cards: SubmittedCardItemDto[];

  @ApiProperty()
  cardCount: number;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty()
  isValid: boolean;

  @ApiPropertyOptional({ type: [String] })
  validationErrors?: string[] | null;

  @ApiProperty()
  submittedAt: Date;

  @ApiPropertyOptional()
  lockedAt?: Date | null;
}
