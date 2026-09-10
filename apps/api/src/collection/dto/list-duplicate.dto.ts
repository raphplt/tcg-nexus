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

/**
 * DTO for listing a duplicate collection item for sale.
 */
export class ListDuplicateDto {
  @ApiProperty({
    description: "Asking price for the listed item",
    example: 12.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ enum: Currency, default: Currency.EUR })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: "Number of copies to list (defaults to 1)",
    default: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: "Optional seller listing description" })
  @IsOptional()
  @IsString()
  description?: string;
}
