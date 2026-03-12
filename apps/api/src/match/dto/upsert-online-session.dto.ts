import { IsInt, IsOptional, Min } from "class-validator";

export class UpsertOnlineSessionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  deckId?: number;
}
