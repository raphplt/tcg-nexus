import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DeckCardRole } from 'src/common/enums/deckCardRole';

export class CreateDeckCardDto {
  @IsInt()
  deckId: number;

  @IsString()
  cardId: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsOptional()
  @IsEnum(DeckCardRole)
  role?: DeckCardRole;
}
