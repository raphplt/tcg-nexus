import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";
import { Languages } from "src/common/enums/languages";
import { ListingStatus } from "src/common/enums/listing-status";
import { CardState } from "src/common/enums/pokemonCardsType";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { Currency } from "../../common/enums/currency";

/**
 * DTO for creating a new marketplace listing.
 */
export class CreateListingDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  sellerId?: number;

  @IsOptional()
  @IsEnum(ProductKind)
  productKind?: ProductKind;

  @IsOptional()
  @IsString()
  pokemonCardId?: string;

  @IsOptional()
  @IsString()
  sealedProductId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityAvailable?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Languages)
  language?: Languages;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  /** Required if productKind = card */
  @IsOptional()
  @IsEnum(CardState)
  cardState?: CardState;

  /** Required if productKind = sealed */
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;

  @IsOptional()
  expiresAt?: Date;
}

/**
 * DTO for creating a new marketplace order.
 */
export class CreateOrderDto {
  buyerId: number;
  totalAmount: number;
  currency: Currency;
  status: any;
  orderItems: any[];
}

/**
 * DTO for creating an order item line.
 */
export class CreateOrderItemDto {
  listingId: number;
  unitPrice: number;
  quantity: number;
}

/**
 * DTO for creating a payment transaction record.
 */
export class CreatePaymentTransactionDto {
  orderId: number;
  method: any;
  status: any;
  transactionId?: string;
  amount: number;
}
