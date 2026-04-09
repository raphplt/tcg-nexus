import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateSealedProductDto } from "./create-sealed-product.dto";

export class UpdateSealedProductDto extends PartialType(
  OmitType(CreateSealedProductDto, ["id"] as const),
) {}
