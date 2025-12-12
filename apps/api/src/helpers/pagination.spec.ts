import { PaginationHelper } from './pagination';

describe('PaginationHelper', () => {
  it('validates params with defaults and bounds', () => {
    expect(PaginationHelper.validateParams({})).toEqual({
      page: 1,
      limit: 10
    });
    expect(PaginationHelper.validateParams({ page: -2, limit: 1000 })).toEqual({
      page: 1,
      limit: 100
    });
  });

  it('calculates offset', () => {
    expect(PaginationHelper.calculateOffset(3, 20)).toBe(40);
  });

  it('creates paginated result metadata', () => {
    const result = PaginationHelper.createPaginatedResult([1, 2], 5, 2, 2);
    expect(result.meta).toMatchObject({
      totalItems: 5,
      itemCount: 2,
      itemsPerPage: 2,
      totalPages: 3,
      currentPage: 2,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  it('paginates query builder with sorting', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1])
    };

    const result = await PaginationHelper.paginateQueryBuilder(
      qb as any,
      { page: 2, limit: 5 },
      'createdAt',
      'DESC'
    );

    expect(qb.orderBy).toHaveBeenCalledWith('createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result.data).toHaveLength(1);
  });
});
