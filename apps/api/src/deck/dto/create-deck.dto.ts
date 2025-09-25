import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeckDto {
  @IsInt()
  userId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  formatId?: number;
}
