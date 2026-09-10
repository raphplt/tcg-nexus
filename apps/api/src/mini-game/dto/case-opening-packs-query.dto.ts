import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { PACK_STYLES, type PackStyle } from "../booster";
import { MAX_ROUND_COUNT, MIN_ROUND_COUNT } from "./mini-game-events.dto";

/** Query of `GET /mini-game/case-opening/packs`. */
export class CaseOpeningPacksQueryDto {
  @ApiPropertyOptional({
    description: "Number of rounds, one booster per player each.",
    minimum: MIN_ROUND_COUNT,
    maximum: MAX_ROUND_COUNT,
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_ROUND_COUNT)
  @Max(MAX_ROUND_COUNT)
  count?: number;

  @ApiPropertyOptional({
    description: "Number of players opening boosters.",
    minimum: 1,
    maximum: 2,
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  players?: number;

  @ApiPropertyOptional({ description: "Restrict cards to this set." })
  @IsOptional()
  @IsString()
  setId?: string;

  @ApiPropertyOptional({
    description: "Restrict cards to every set of this series.",
  })
  @IsOptional()
  @IsString()
  serieId?: string;

  @ApiPropertyOptional({ enum: PACK_STYLES, default: "standard" })
  @IsOptional()
  @IsIn(PACK_STYLES)
  style?: PackStyle;
}
