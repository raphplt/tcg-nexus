import { IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentIntentDto {
  @ApiProperty({
    required: false,
    description: "Optional metadata (string values only)",
  })
  @IsOptional()
  metadata?: Record<string, string>;
}
