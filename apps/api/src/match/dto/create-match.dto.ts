import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { MatchPhase } from "../entities/match.entity";

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

  @IsOptional()
  @IsBoolean()
  skipStatusCheck?: boolean;
}
