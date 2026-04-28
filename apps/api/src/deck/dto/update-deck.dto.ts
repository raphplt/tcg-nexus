import { PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { DeckCardRole } from "../../common/enums/deckCardRole";
import { CreateDeckDto } from "./create-deck.dto";

class DeckCardDto {
  @IsUUID()
  cardId: string;

  @IsInt()
  qty: number;

  @IsString()
  role: string;
}

class UpdateCardDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsInt()
  qty: number;

  @IsOptional()
  @IsString()
  role: DeckCardRole;
}
class DeckCardDeleteDto {
  @IsInt()
  id: number;
}
export class UpdateDeckDto extends PartialType(CreateDeckDto) {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckCardDto)
  cardsToAdd: DeckCardDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeckCardDeleteDto)
  cardsToRemove: DeckCardDeleteDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateCardDto)
  cardsToUpdate: UpdateCardDto[];
}
