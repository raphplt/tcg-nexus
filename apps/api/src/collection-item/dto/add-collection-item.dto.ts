import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SealedCondition } from "../../common/enums/sealed-condition";

/**
 * Payload for adding a single card item into a collection or wishlist.
 */
export class AddCardItemDto {
  @ApiProperty({
    description: "Unique catalog card UUID",
    example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  })
  @IsString()
  @IsNotEmpty()
  pokemonCardId: string;

  @ApiPropertyOptional({
    description: "Card physical condition state code (e.g. NM, LP, EX)",
    example: "NM",
  })
  @IsOptional()
  @IsString()
  cardStateCode?: string;

  @ApiPropertyOptional({
    description: "Card variant type (e.g. normal, holo, reverse)",
    example: "holo",
  })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({
    description: "Card language code (e.g. fr, en, ja)",
    example: "en",
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: "Card printing edition (e.g. 1st_edition, unlimited)",
    example: "1st_edition",
  })
  @IsOptional()
  @IsString()
  printing?: string;

  @ApiPropertyOptional({
    description: "Custom physical storage location (e.g. Binder A, Box 2)",
    example: "Binder A",
  })
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional({
    description: "User private notes regarding the item",
    example: "Pulled from booster pack on 2026-05-12",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Payload for adding a sealed product item into a collection or wishlist.
 */
export class AddSealedItemDto {
  @ApiProperty({
    description: "Unique sealed product catalog UUID",
    example: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  })
  @IsString()
  @IsNotEmpty()
  sealedProductId: string;

  @ApiPropertyOptional({
    enum: SealedCondition,
    description: "Physical packaging condition of the sealed product",
    example: SealedCondition.SEALED,
  })
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;
}
