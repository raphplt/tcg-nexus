import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateRankingDto {
  @IsNumber()
  tournamentId: number;

  @IsNumber()
  playerId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rank?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  losses?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  draws?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  winRate?: number;
}
