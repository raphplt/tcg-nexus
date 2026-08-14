import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SealedCondition } from "src/common/enums/sealed-condition";

export class AddCardItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pokemonCardId: string;
}

export class AddSealedItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sealedProductId: string;

  @ApiPropertyOptional({ enum: SealedCondition })
  @IsOptional()
  @IsEnum(SealedCondition)
  sealedCondition?: SealedCondition;
}
