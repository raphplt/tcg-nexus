import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";
import { Currency } from "../../common/enums/currency";
import { Languages } from "../../common/enums/languages";
import { ListingStatus } from "../../common/enums/listing-status";
import { CardState } from "../../common/enums/pokemonCardsType";
import { ProductKind } from "../../common/enums/product-kind";
import { SealedCondition } from "../../common/enums/sealed-condition";

/**
 * Data transfer object for creating a new marketplace listing.
 */
export class CreateListingDto {
  @ApiPropertyOptional({
    description: "Seller identifier (defaults to authenticated user)",
    example: 42,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  sellerId?: number;

  @ApiPropertyOptional({
    description: "Product category (card or sealed product)",
    enum: ProductKind,
    default: ProductKind.CARD,
  })
  @IsOptional()
  @IsEnum(ProductKind)
  productKind?: ProductKind;

  @ApiPropertyOptional({
    description: "Unique card identifier if listing a single card",
    example: "base1-4",
  })
  @IsOptional()
  @IsString()
  pokemonCardId?: string;

  @ApiPropertyOptional({
    description: "Unique sealed product identifier if listing sealed stock",
    example: "sealed-etb-151",
  })
  @IsOptional()
  @IsString()
  sealedProductId?: string;

  @ApiProperty({
    description: "Unit price for the item",
    example: 19.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    description: "Pricing currency",
    enum: Currency,
    default: Currency.EUR,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({
    description: "Number of units available for sale",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantityAvailable?: number;

  @ApiPropertyOptional({
    description:
      "Seller notes or description regarding condition and packaging",
    example: "Near mint condition, sleeved and top-loaded immediately.",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Printed language of the card or sealed box",
    enum: Languages,
    default: Languages.FR,
  })
  @IsOptional()
  @IsEnum(Languages)
  language?: Languages;

  @ApiPropertyOptional({
    description: "Initial listing status",
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({
    description:
      "Physical condition of the card (required if productKind = card)",
    enum: CardState,
  })
  @IsOptional()
  @IsEnum(CardState)
  cardState?: CardState;

  @ApiPropertyOptional({
    description:
      "Condition of the sealed packaging (required if productKind = sealed)",
    enum: SealedCondition,
  })
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;

  @ApiPropertyOptional({
    description:
      "Expiration timestamp after which the listing becomes inactive",
  })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({
    description:
      "Optional collection_item ID if this listing is backed by personal collection inventory",
    example: 105,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  inventoryItemId?: number;
}
