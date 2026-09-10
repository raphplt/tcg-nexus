import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * Payload for authenticating with email and password credentials.
 */
export class LoginDto {
  @ApiProperty({
    example: "trainer@tcgnexus.com",
    description: "Registered user email address",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "superSecret123",
    description: "Account password (minimum 6 characters)",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
