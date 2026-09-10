import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { Currency } from "../../common/enums/currency";
import { SUPPORTED_LOCALES } from "../../translation/supported-locales";

/**
 * Payload for updating the authenticated user's personal profile attributes.
 * Administrative fields (role, isPro, isActive, emailVerified) are strictly excluded.
 */
export class UpdateMyProfileDto {
  @ApiPropertyOptional({
    description: "User first name",
    example: "Ash",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: "User last name",
    example: "Ketchum",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: "Avatar image URL",
    example: "https://example.com/avatars/ash.png",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
    description: "Preferred user interface language locale",
    example: "en",
  })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale?: string;
}
