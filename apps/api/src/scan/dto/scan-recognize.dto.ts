import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { CardGame } from "../../common/enums/cardGame";

/**
 * Data transfer object for multi-frame card scan and recognition requests.
 */
export class ScanRecognizeDto {
  @ApiPropertyOptional({
    description: "Trading card game ecosystem (defaults to pokemon)",
    enum: CardGame,
    default: CardGame.Pokemon,
  })
  @IsOptional()
  @IsEnum(CardGame)
  game?: CardGame;
}
