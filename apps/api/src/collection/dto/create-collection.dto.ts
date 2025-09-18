import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  userId: string;
}
