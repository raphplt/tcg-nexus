import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from "class-validator";
import { Currency } from "../../common/enums/currency";
import { UserRole } from "../../common/enums/user";
import { SUPPORTED_LOCALES } from "../../translation/supported-locales";
import { CreateUserDto } from "./create-user.dto";

/**
 * Payload for administrative user updates.
 * Allows administrators to update user status, role, pro subscription, and verification flags.
 */
export class AdminUpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: "User profile avatar image URL",
    example: "https://example.com/avatars/red.png",
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    enum: Currency,
    description: "Preferred display currency",
    example: Currency.USD,
  })
  @IsOptional()
  @IsEnum(Currency)
  preferredCurrency?: Currency;

  @ApiPropertyOptional({
    description: "Preferred UI/Card locale",
    example: "en",
  })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale?: string;

  @ApiPropertyOptional({
    description: "Whether the user holds an active Pro subscription",
  })
  @IsOptional()
  @IsBoolean()
  isPro?: boolean;

  @ApiPropertyOptional({
    description: "Whether the user account is enabled",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Whether user email address has been verified",
  })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({
    enum: UserRole,
    description: "Assigned user permission role",
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
