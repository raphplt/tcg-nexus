import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { SealedProductType } from "../enums/sealed-product-type.enum";

export class SealedProductFilterDto {
  @IsOptional()
  @IsString()
  setId?: string;

  @IsOptional()
  @IsEnum(SealedProductType)
  productType?: SealedProductType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
