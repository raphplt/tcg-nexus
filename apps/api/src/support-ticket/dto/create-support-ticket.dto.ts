import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/**
 * Payload for submitting a new customer support ticket.
 */
export class CreateSupportTicketDto {
  @ApiProperty({
    description: "Brief summary subject of the issue",
    example: "Question regarding marketplace transaction #1042",
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  subject: string;

  @ApiProperty({
    description: "Detailed description of the issue or inquiry",
    example:
      "Hello, I placed an order yesterday and would like to confirm the tracking details.",
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message: string;
}
