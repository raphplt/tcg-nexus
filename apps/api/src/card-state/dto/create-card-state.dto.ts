import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { CardStateCode } from "../entities/card-state.entity";

/**
 * Payload for creating a new card condition state.
 */
export class CreateCardStateDto {
  /**
   * Standard condition code classification.
   */
  @ApiProperty({
    description: "Standard card grading condition code",
    enum: CardStateCode,
    example: CardStateCode.NM,
  })
  @IsEnum(CardStateCode)
  code: CardStateCode;

  /**
   * Human-readable display label.
   */
  @ApiProperty({
    description: "Descriptive label for the condition grade",
    example: "Near Mint",
  })
  @IsString()
  @IsNotEmpty()
  label: string;
}
