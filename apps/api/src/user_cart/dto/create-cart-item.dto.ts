import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsPositive, Min } from "class-validator";

/**
 * Payload for adding an item listing to the user's active shopping cart.
 */
export class CreateCartItemDto {
  @ApiProperty({
    description: "Marketplace listing identifier to add to cart",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  listingId: number;

  @ApiProperty({
    description: "Quantity to add to cart",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
