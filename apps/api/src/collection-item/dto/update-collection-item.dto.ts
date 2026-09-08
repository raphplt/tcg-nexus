import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from "class-validator";
import { SealedCondition } from "src/common/enums/sealed-condition";

/**
 * DTO for updating physical attributes of a collection item.
 */
export class UpdateCollectionItemDto {
  @ApiPropertyOptional({
    description: "Card condition state code (e.g. NM, EX, LP)",
  })
  @IsOptional()
  @IsString()
  cardStateCode?: string;

  @ApiPropertyOptional({ enum: SealedCondition })
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;

  @ApiPropertyOptional({
    description: "Card variant (e.g. normal, holo, reverse, firstEdition)",
  })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ description: "Item language (e.g. fr, en, ja)" })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: "Printing/edition (e.g. 1st_edition, unlimited, promo)",
  })
  @IsOptional()
  @IsString()
  printing?: string;

  @ApiPropertyOptional({ description: "Acquisition date" })
  @IsOptional()
  @IsDateString()
  acquiredAt?: Date;

  @ApiPropertyOptional({ description: "Acquisition purchase cost" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  acquisitionCost?: number;

  @ApiPropertyOptional({ description: "Acquisition currency" })
  @IsOptional()
  @IsString()
  acquisitionCurrency?: string;

  @ApiPropertyOptional({ description: "Storage location (binder, box, shelf)" })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({ description: "User notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Photo URLs", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: "Total owned copies" })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number;
}
