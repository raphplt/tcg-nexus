import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  Max,
} from "class-validator";
import { CardState } from "src/common/enums/pokemonCardsType";
import { ProductKind } from "src/common/enums/product-kind";
import { SealedCondition } from "src/common/enums/sealed-condition";
import { Currency } from "../../common/enums/currency";

export class CreateListingDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  sellerId?: number;

  /** Type de produit listé. Détermine quel champ FK doit être renseigné. */
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
  @Min(0.01)
  @Max(50000)
  price: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantityAvailable?: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** Requis si productKind = card */
  @IsOptional()
  @IsEnum(CardState)
  cardState?: CardState;

  /** Requis si productKind = sealed */
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;

  @IsOptional()
  expiresAt?: Date;
}

export class CreateOrderDto {
  buyerId: number;
  totalAmount: number;
  currency: Currency;
  status: any;
  orderItems: any[];
}

export class CreateOrderItemDto {
  listingId: number;
  unitPrice: number;
  quantity: number;
}

export class CreatePaymentTransactionDto {
  orderId: number;
  method: any;
  status: any;
  transactionId?: string;
  amount: number;
}
