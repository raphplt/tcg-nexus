import { IsEnum, IsOptional } from "class-validator";
import { CardGame } from "../../common/enums/cardGame";

export class ScanRecognizeDto {
  @IsOptional()
  @IsEnum(CardGame)
  game?: CardGame;
}
