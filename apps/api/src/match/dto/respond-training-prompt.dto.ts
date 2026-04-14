import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class TrainingPromptResponseDto {
  @IsString()
  promptId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selections?: string[];

  @IsOptional()
  @IsInt()
  numericChoice?: number;
}

export class RespondTrainingPromptDto {
  @ValidateNested()
  @Type(() => TrainingPromptResponseDto)
  response: TrainingPromptResponseDto;
}
