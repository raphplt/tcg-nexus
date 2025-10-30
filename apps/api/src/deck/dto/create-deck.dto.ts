import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeckCardRole } from '../../common/enums/deckCardRole';

class DeckCardInputDto {
  @IsUUID()
  cardId: string;

  @IsInt()
  qty: number;

  @IsEnum(DeckCardRole)
  role: DeckCardRole;
}

export class CreateDeckDto {
  @IsString()
  @IsNotEmpty()
  deckName: string;

  @IsBoolean()
  isPublic: boolean;

  @IsInt()
  formatId: number;

  @ValidateNested({ each: true })
  @Type(() => DeckCardInputDto)
  cards: DeckCardInputDto[];
}
