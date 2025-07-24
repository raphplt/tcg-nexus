import { PartialType } from '@nestjs/swagger';
import {
  CreateListingDto,
  CreateOrderDto,
  CreateOrderItemDto,
  CreatePaymentTransactionDto
} from './create-marketplace.dto';

export class UpdateListingDto extends PartialType(CreateListingDto) {}
export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {}
export class UpdatePaymentTransactionDto extends PartialType(
  CreatePaymentTransactionDto
) {}
