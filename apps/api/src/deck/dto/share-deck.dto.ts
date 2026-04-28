import { IsDateString, IsOptional } from "class-validator";

export class ShareDeckDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
