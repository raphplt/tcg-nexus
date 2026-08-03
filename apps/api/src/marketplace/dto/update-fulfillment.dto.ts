import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { FulfillmentStatus } from "src/common/enums/fulfillment-status";

export class UpdateFulfillmentDto {
  @ApiProperty({ enum: FulfillmentStatus })
  @IsEnum(FulfillmentStatus)
  fulfillmentStatus: FulfillmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  trackingNumber?: string;
}
