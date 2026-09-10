import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { MAX_ROUND_COUNT, MIN_ROUND_COUNT } from "./mini-game-events.dto";

/** Query of `GET /mini-game/juste-prix/items`. */
export class JustePrixItemsQueryDto {
  @ApiPropertyOptional({
    description: "Number of rounds to draw items for.",
    minimum: MIN_ROUND_COUNT,
    maximum: MAX_ROUND_COUNT,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_ROUND_COUNT)
  @Max(MAX_ROUND_COUNT)
  count?: number;

  @ApiPropertyOptional({ description: "Restrict cards to this set." })
  @IsOptional()
  @IsString()
  setId?: string;
}
