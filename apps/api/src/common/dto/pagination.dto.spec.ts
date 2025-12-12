import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('should transform and validate numeric values', () => {
    const dto = plainToInstance(PaginationDto, { page: '2', limit: '5' });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
  });

  it('should reject invalid limit', () => {
    const dto = plainToInstance(PaginationDto, { limit: 0 });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
