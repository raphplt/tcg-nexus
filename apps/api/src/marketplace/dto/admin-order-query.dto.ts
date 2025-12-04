import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationParams } from 'src/helpers/pagination';
import { OrderStatus } from '../entities/order.entity';

export class AdminOrderQueryDto implements PaginationParams {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buyerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sellerId?: number;
}
