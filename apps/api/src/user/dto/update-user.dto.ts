import { PartialType } from "@nestjs/mapped-types";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from "class-validator";
import { Currency } from "src/common/enums/currency";
import { UserRole } from "src/common/enums/user";
import { SUPPORTED_LOCALES } from "src/translation/supported-locales";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(Currency)
  preferredCurrency?: Currency;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale?: string;

  @IsOptional()
  @IsBoolean()
  isPro?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
