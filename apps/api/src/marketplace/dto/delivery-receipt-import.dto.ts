import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * Item configuration for receipt import into collection (INT-03).
 */
export class ReceiptImportItemDto {
  @ApiProperty({ description: "Target OrderItem ID to import" })
  @IsInt()
  orderItemId: number;

  @ApiPropertyOptional({ description: "Card condition override (e.g. Near Mint)" })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: "Physical variant/finish (e.g. Holo, Reverse, Normal)" })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ description: "Physical storage location (e.g. Binder A, Deck Box 1)" })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: "Personal notes for collection entry" })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Request payload to import delivered order items into user's collection (INT-03).
 */
export class ReceiptImportRequestDto {
  @ApiPropertyOptional({
    description: "Target collection ID (defaults to user's default collection)",
  })
  @IsOptional()
  @IsString()
  collectionId?: string;

  @ApiProperty({
    description: "Delivered items to import",
    type: [ReceiptImportItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptImportItemDto)
  items: ReceiptImportItemDto[];

  @ApiPropertyOptional({
    description: "Allow duplicate import if item was already recorded",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDuplicates?: boolean;
}

/**
 * Preview item for collection receipt import (INT-03).
 */
export class ReceiptImportPreviewItemDto {
  @ApiProperty()
  orderItemId: number;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  productImage?: string | null;

  @ApiPropertyOptional()
  cardId?: string | null;

  @ApiPropertyOptional()
  sealedProductId?: string | null;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  condition?: string | null;

  @ApiPropertyOptional()
  language?: string | null;

  @ApiProperty()
  fulfillmentStatus: string;

  @ApiPropertyOptional()
  deliveredAt?: Date | null;

  @ApiProperty({
    description: "Whether this item was already recorded in collection",
  })
  alreadyImported: boolean;

  @ApiPropertyOptional()
  existingCollectionItemId?: number | null;
}

/**
 * Preview response for collection receipt import (INT-03).
 */
export class ReceiptImportPreviewResponseDto {
  @ApiProperty()
  orderId: number;

  @ApiProperty()
  isOrderDelivered: boolean;

  @ApiProperty({ type: [ReceiptImportPreviewItemDto] })
  items: ReceiptImportPreviewItemDto[];
}
