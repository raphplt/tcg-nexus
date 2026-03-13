import { Type } from "class-transformer";
import { IsEnum, IsObject, IsOptional, ValidateNested } from "class-validator";
import { ActionType } from "../engine/actions/Action";

class TrainingActionInputDto {
  @IsEnum(ActionType)
  type: ActionType;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class DispatchTrainingActionDto {
  @ValidateNested()
  @Type(() => TrainingActionInputDto)
  action: TrainingActionInputDto;
}
