import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/** One card of an ad-hoc pool, with the copies played. */
export class AnalyzePoolCardDto {
  @ApiProperty({ description: "Catalog card identifier" })
  @IsString()
  cardId: string;

  @ApiProperty({ description: "Copies played", example: 4, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  qty?: number;
}

/**
 * Request payload for analyzing a card pool that is not a persisted deck —
 * typically a list being assembled in the deck builder.
 */
export class AnalyzePoolDto {
  @ApiProperty({ type: [AnalyzePoolCardDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @ValidateNested({ each: true })
  @Type(() => AnalyzePoolCardDto)
  cards: AnalyzePoolCardDto[];

  @ApiProperty({
    description: "Format to check legality against",
    required: false,
  })
  @IsOptional()
  @IsInt()
  formatId?: number;
}
