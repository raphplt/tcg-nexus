import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchPhase } from '../entities/match.entity';

export class CreateMatchDto {
  @IsNumber()
  tournamentId: number;

  @IsOptional()
  @IsNumber()
  playerAId?: number;

  @IsOptional()
  @IsNumber()
  playerBId?: number;

  @IsNumber()
  @Min(1)
  round: number;

  @IsEnum(MatchPhase)
  phase: MatchPhase;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  scheduledDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
