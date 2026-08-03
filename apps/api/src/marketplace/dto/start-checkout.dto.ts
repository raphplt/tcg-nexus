import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class StartCheckoutDto {
  @ApiProperty({
    description:
      "Adresse de livraison, figée sur la commande au moment du checkout",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  shippingAddress: string;
}
