import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class CreatePaymentIntentDto {
  @ApiProperty({
    required: false,
    description: "Optional metadata (string values only)",
  })
  @IsOptional()
  metadata?: Record<string, string>;
}
