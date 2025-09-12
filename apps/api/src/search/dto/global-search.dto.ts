import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GlobalSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  type?: 'all' | 'cards' | 'tournaments' | 'players' | 'marketplace';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'relevance';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export interface SearchResultItem {
  id: string | number;
  type: 'card' | 'tournament' | 'player' | 'marketplace';
  title: string;
  description: string;
  url: string;
  image?: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}

export interface GlobalSearchResult {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  searchTime: number;
}
