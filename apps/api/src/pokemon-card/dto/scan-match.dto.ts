import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * Payload for matching cards against OCR-extracted scanner data.
 */
export class ScanMatchDto {
  @ApiPropertyOptional({
    description: "Card name extracted via OCR",
    example: "Pikachu",
  })
  @IsOptional()
  @IsString()
  cardName?: string;

  @ApiPropertyOptional({
    description: "Number within set e.g. 045 or 045/198",
    example: "025",
  })
  @IsOptional()
  @IsString()
  localId?: string;

  @ApiPropertyOptional({
    description: "Extracted set name",
    example: "Base Set",
  })
  @IsOptional()
  @IsString()
  setName?: string;

  @ApiPropertyOptional({
    description: "Raw card number before slash",
    example: "025",
  })
  @IsOptional()
  @IsString()
  setNumber?: string;

  @ApiPropertyOptional({
    description: "Total set card count after slash",
    example: "102",
  })
  @IsOptional()
  @IsString()
  setTotal?: string;
}
