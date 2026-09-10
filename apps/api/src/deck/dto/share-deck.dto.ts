import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

/**
 * Configuration payload for generating a public deck share link.
 */
export class ShareDeckDto {
  @ApiPropertyOptional({
    description: "Optional expiration date-time for the share link",
    example: "2026-12-31T23:59:59.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
