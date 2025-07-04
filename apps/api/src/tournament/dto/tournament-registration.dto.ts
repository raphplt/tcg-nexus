import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TournamentRegistrationDto {
  @IsNumber()
  tournamentId: number;

  @IsNumber()
  playerId: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
