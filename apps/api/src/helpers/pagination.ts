import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

/**
 * Paginated result container including items payload and pagination metadata.
 */
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

/**
 * Input parameters for pagination.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Helper utility for validating pagination parameters and formatting paginated responses.
 */
export class PaginationHelper {
  static DEFAULT_PAGE = 1;
  static DEFAULT_LIMIT = 10;
  static MAX_LIMIT = 100;

  /**
   * Validates and sanitizes pagination parameters within allowed bounds.
   *
   * @param params Raw pagination parameters.
   * @returns Sanitized page and limit values.
   */
  static validateParams(params: PaginationParams): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, params.page || this.DEFAULT_PAGE);
    const limit = Math.min(
      Math.max(1, params.limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT,
    );

    return { page, limit };
  }

  /**
   * Calculates the SQL query offset given page and limit.
   *
   * @param page Current 1-based page index.
   * @param limit Items per page.
   * @returns 0-based offset.
   */
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Constructs a PaginatedResult object with payload and metadata.
   *
   * @param data Array of records for the current page.
   * @param totalItems Total count of records across all pages.
   * @param page Current page number.
   * @param limit Maximum items per page.
   * @returns Formatted PaginatedResult.
   */
  static createPaginatedResult<T>(
    data: T[],
    totalItems: number,
    page: number,
    limit: number,
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
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Paginates, filters, and sorts a TypeORM QueryBuilder in a generic way.
   *
   * @param queryBuilder TypeORM QueryBuilder pre-configured with required joins.
   * @param params Pagination parameters (page, limit).
   * @param sortBy Optional sort field name.
   * @param sortOrder Sorting order ('ASC' | 'DESC').
   * @returns Paginated result object containing items and metadata.
   */
  static async paginateQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    params: PaginationParams = {},
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "ASC",
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
