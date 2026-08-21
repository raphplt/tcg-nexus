import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from "class-validator";
import { TournamentType } from "../entities/tournament.entity";

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsEnum(TournamentType)
  type: TournamentType;

  @IsOptional()
  @IsNumber()
  @Min(2)
  maxPlayers?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  minPlayers?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationDeadline?: Date;

  @IsOptional()
  @IsBoolean()
  allowLateRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  ageRestrictionMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  ageRestrictionMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFormats?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  /**
   * Double elimination only: leave the finalist coming from the losers bracket
   * a second match to win the title. Enabled by default.
   */
  @IsOptional()
  @IsBoolean()
  grandFinalReset?: boolean;

  @ValidateIf(
    (dto: CreateTournamentDto) =>
      dto.isExternal === true || dto.externalRegistrationUrl !== undefined,
  )
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  externalRegistrationUrl?: string;
}
