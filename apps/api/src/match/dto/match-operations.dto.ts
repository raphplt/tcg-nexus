import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { MatchStatus } from "../entities/match.entity";

export class ReportScoreDto {
  @IsNumber()
  @Min(0)
  playerAScore: number;

  @IsNumber()
  @Min(0)
  playerBScore: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsBoolean()
  isForfeit?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartMatchDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResetMatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason: string;
}
