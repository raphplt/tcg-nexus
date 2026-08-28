import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterTournamentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /**
   * Player identifier sent by older mobile builds.
   *
   * NOTE: accepted but never used — the controller always resolves the player
   * from the authenticated user, so a caller cannot register someone else.
   * The field only exists because `forbidNonWhitelisted` would otherwise
   * reject those clients with a 400 they cannot recover from.
   */
  @IsOptional()
  @IsInt()
  playerId?: number;
}
