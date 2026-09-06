import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { Currency } from "src/common/enums/currency";
import { SUPPORTED_LOCALES } from "src/translation/supported-locales";

/**
 * Payload for updating the authenticated user's personal profile attributes.
 * Administrative fields (role, isPro, isActive, emailVerified) are strictly excluded.
 */
export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(Currency)
  preferredCurrency?: Currency;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale?: string;
}
