import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { SealedEventType } from "../entities/sealed-event.entity";

/**
 * Data transfer object for reporting a sealed product engagement event.
 */
export class CreateSealedEventDto {
  @ApiProperty({
    description: "Unique identifier of the sealed product",
    example: "sealed-etb-151",
  })
  @IsString()
  sealedProductId: string;

  @ApiProperty({
    description: "Type of engagement event on the sealed product",
    enum: SealedEventType,
    example: SealedEventType.VIEW,
  })
  @IsEnum(SealedEventType)
  eventType: SealedEventType;

  @ApiPropertyOptional({
    description: "Client or anonymous session identifier",
    example: "sess_987654321",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description:
      "Optional contextual metadata (referrer, search query, listing ID)",
  })
  @IsOptional()
  @IsObject()
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };
}
