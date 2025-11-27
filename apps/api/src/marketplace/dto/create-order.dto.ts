import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
