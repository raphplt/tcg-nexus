import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterTokenDto {
  @ApiProperty({ description: "The push token from Expo or FCM" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: "Platform name (e.g. expo, ios, android, web)", required: false })
  @IsString()
  @IsOptional()
  platform?: string;
}
