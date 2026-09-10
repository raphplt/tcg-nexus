import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * Payload for registering a new user account.
 */
export class RegisterDto {
  @ApiProperty({
    example: "trainer@tcgnexus.com",
    description: "Unique user email address",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "Ash",
    description: "User first name",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: "Ketchum",
    description: "User last name",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: "superSecret123",
    description: "User password (minimum 6 characters)",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: "superSecret123",
    description: "Password confirmation matching the password field",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmPassword: string;
}
