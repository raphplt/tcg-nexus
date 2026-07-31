import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum BulkRegistrationAction {
  CONFIRM = "confirm",
  CANCEL = "cancel",
  CHECK_IN = "check_in",
}

export class BulkRegistrationActionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  registrationIds: number[];

  @IsEnum(BulkRegistrationAction)
  action: BulkRegistrationAction;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
