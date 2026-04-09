import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
}
