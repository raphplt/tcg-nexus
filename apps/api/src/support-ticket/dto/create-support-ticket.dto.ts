import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  subject: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message: string;
}