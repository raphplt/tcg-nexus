import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDate,
  IsArray,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TournamentType,
  TournamentStatus
} from '../entities/tournament.entity';
import { PricingType } from '../entities/tournament-pricing.entity';
import { RewardType } from '../entities/tournament-reward.entity';

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
}

export class CreateTournamentPricingDto {
  @IsEnum(PricingType)
  type: PricingType;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  earlyBirdPrice?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  earlyBirdDeadline?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lateRegistrationPrice?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lateRegistrationStart?: Date;

  @IsOptional()
  @IsString()
  priceDescription?: string;

  @IsOptional()
  @IsBoolean()
  refundable?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  refundDeadline?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundFeePercentage?: number;

  @IsOptional()
  @IsString()
  paymentInstructions?: string;
}

export class CreateTournamentRewardDto {
  @IsNumber()
  @Min(1)
  position: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RewardType)
  type: RewardType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashValue?: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productBrand?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsValue?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateFullTournamentDto extends CreateTournamentDto {
  @IsOptional()
  @Type(() => CreateTournamentPricingDto)
  pricing?: CreateTournamentPricingDto;

  @IsOptional()
  @IsArray()
  @Type(() => CreateTournamentRewardDto)
  rewards?: CreateTournamentRewardDto[];
}

export class TournamentRegistrationDto {
  @IsNumber()
  tournamentId: number;

  @IsNumber()
  playerId: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTournamentStatusDto {
  @IsEnum(TournamentStatus)
  status: TournamentStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
