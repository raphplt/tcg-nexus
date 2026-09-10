import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * Payload for refreshing an existing JWT token pair.
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: "Cryptographic refresh token string",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
