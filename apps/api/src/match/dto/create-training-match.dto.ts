import { IsEnum, IsInt, IsString, Min } from "class-validator";
import { TrainingDifficulty } from "../entities/training-match-session.entity";

export class CreateTrainingMatchDto {
  @IsInt()
  @Min(1)
  deckId: number;

  @IsString()
  aiDeckPresetId: string;

  @IsEnum(TrainingDifficulty)
  difficulty: TrainingDifficulty;
}
