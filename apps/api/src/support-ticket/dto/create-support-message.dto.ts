import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;
}