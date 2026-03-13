import { IsInt, Min } from "class-validator";

export class JoinMatchmakingDto {
  @IsInt()
  @Min(1)
  deckId: number;
}
