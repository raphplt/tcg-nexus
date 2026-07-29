import { IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterTournamentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
