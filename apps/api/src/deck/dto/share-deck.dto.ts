import { IsOptional, IsDateString } from 'class-validator';

export class ShareDeckDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
