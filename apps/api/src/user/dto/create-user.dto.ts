import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { UserRole } from "../../common/enums/user";

/**
 * Payload for administrative user creation.
 */
export class CreateUserDto {
  @ApiProperty({
    example: "trainer@tcgnexus.com",
    description: "User email address",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "Red",
    description: "User first name",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: "Pallet",
    description: "User last name",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: "superSecretPassword123",
    description: "Account initial password",
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.USER,
    description: "Assigned user role",
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    default: false,
    description: "Whether the user holds a Pro subscription",
  })
  @IsBoolean()
  @IsOptional()
  isPro?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: "Whether the user account is active",
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
