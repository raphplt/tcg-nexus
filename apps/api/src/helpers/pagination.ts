import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class PaginationHelper {
  static DEFAULT_PAGE = 1;
  static DEFAULT_LIMIT = 10;
  static MAX_LIMIT = 100;

  static validateParams(params: PaginationParams): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, params.page || this.DEFAULT_PAGE);
    const limit = Math.min(
      Math.max(1, params.limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT
    );

    return { page, limit };
  }

  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createPaginatedResult<T>(
    data: T[],
    totalItems: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(totalItems / limit);
    const itemCount = data.length;

    return {
      data,
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Paginate, filter and sort a TypeORM QueryBuilder in a generic way
   * @param queryBuilder Le QueryBuilder TypeORM (déjà configuré avec les relations nécessaires)
   * @param params PaginationParams (page, limit)
   * @param sortBy Champ de tri (optionnel)
   * @param sortOrder 'ASC' | 'DESC' (optionnel)
   * @returns PaginatedResult<T>
   *
   * Utilisation :
   *   const qb = repo.createQueryBuilder('entity');
   *   // ...ajouter vos filtres...
   *   return PaginationHelper.paginateQueryBuilder(qb, { page, limit }, 'createdAt', 'DESC');
   */
  static async paginateQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: PaginationParams = {},
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC'
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = this.validateParams(params);
    if (sortBy) {
      queryBuilder.orderBy(sortBy, sortOrder);
    }
    const skip = this.calculateOffset(page, limit);
    queryBuilder.skip(skip).take(limit);
    const [data, total] = await queryBuilder.getManyAndCount();
    return this.createPaginatedResult(data, total, page, limit);
  }
}
