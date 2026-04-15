import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";
import { CreateCartItemDto } from "./create-cart-item.dto";

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {
  @ApiProperty({
    description: "Nouvelle quantité pour cet item",
    example: 2,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
