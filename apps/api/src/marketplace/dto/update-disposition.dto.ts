import { IsEnum, IsOptional, IsString } from "class-validator";
import { InventoryDisposition } from "src/common/enums/inventory-disposition";

/**
 * Payload for setting the inspected physical inventory disposition of a return.
 */
export class UpdateDispositionDto {
  @IsEnum(InventoryDisposition)
  disposition: InventoryDisposition;

  @IsOptional()
  @IsString()
  notes?: string;
}
