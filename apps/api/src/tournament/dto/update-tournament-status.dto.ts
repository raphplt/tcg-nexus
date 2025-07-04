import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TournamentStatus } from '../entities/tournament.entity';

export class UpdateTournamentStatusDto {
  @IsEnum(TournamentStatus)
  status: TournamentStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
