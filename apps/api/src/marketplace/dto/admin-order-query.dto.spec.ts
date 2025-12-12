import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { AdminOrderQueryDto } from './admin-order-query.dto';
import { OrderStatus } from '../entities/order.entity';

describe('AdminOrderQueryDto', () => {
  it('transforms and validates numeric fields', () => {
    const dto = plainToInstance(AdminOrderQueryDto, {
      page: '2',
      limit: '5',
      status: OrderStatus.PAID,
      buyerId: '10',
      sellerId: '20'
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
    expect(dto.buyerId).toBe(10);
    expect(dto.sellerId).toBe(20);
  });
});
