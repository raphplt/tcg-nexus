import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  Min,
  IsBoolean
} from 'class-validator';
import { MatchStatus } from '../entities/match.entity';

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
  @IsOptional()
  @IsString()
  reason?: string;
}
