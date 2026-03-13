import { IsInt, Min } from "class-validator";

export class SelectCasualDeckDto {
  @IsInt()
  @Min(1)
  deckId: number;
}
