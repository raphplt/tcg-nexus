import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCollectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsNumber()
  userId: number;

  @IsString()
  @IsOptional()
  masterSetId?: string;
}
