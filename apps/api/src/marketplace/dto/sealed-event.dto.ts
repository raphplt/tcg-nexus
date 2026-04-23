import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { SealedEventType } from "../entities/sealed-event.entity";

export class CreateSealedEventDto {
  @IsString()
  sealedProductId: string;

  @IsEnum(SealedEventType)
  eventType: SealedEventType;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };
}
