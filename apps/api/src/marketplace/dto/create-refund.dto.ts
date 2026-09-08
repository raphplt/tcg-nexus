import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsInt,
  MaxLength,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Line item allocation for a partial refund request.
 */
export class RefundLineDto {
  @IsInt()
  orderItemId: number;

  /** Use zero for a monetary adjustment without another refunded copy. */
  @IsInt()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingAmount?: number;
}

/**
 * Payload for initiating a partial or full refund on an order.
 */
export class CreateRefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestKey?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundLineDto)
  lines?: RefundLineDto[];
}
