import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/**
 * Payload for appending a new message to an existing support ticket thread.
 */
export class CreateSupportMessageDto {
  @ApiProperty({
    description: "Support message body text",
    example: "I have uploaded the requested proof of purchase.",
    minLength: 2,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message: string;
}
