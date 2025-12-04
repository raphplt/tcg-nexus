import { PartialType } from '@nestjs/mapped-types';
import { CreateMatchDto } from './create-match.dto';
import { IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { MatchStatus } from '../entities/match.entity';

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  playerAScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  playerBScore?: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
