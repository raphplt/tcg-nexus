import { Currency } from '../../common/enums/currency';
import { CardState } from '../entities/listing.entity';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min
} from 'class-validator';

export class CreateListingDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  sellerId?: number;

  @IsString()
  @IsNotEmpty()
  pokemonCardId: string;

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

  @IsEnum(CardState)
  cardState: CardState;

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
