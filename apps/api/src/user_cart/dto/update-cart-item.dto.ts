import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";
import { CreateCartItemDto } from "./create-cart-item.dto";

/**
 * Payload for updating the quantity of an existing item in the shopping cart.
 */
export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {
  @ApiPropertyOptional({
    description: "New quantity for this cart item",
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
