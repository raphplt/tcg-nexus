import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * Query parameters for global platform search across catalog, tournaments, players, and marketplace.
 */
export class GlobalSearchDto {
  @ApiProperty({ description: "Search query text", example: "Charizard" })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: "Target entity type filter",
    enum: ["all", "cards", "tournaments", "players", "marketplace"],
    default: "all",
  })
  @IsOptional()
  @IsString()
  type?: "all" | "cards" | "tournaments" | "players" | "marketplace";

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 10,
    default: 10,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: "Sort field",
    example: "relevance",
    default: "relevance",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "relevance";

  @ApiPropertyOptional({
    description: "Sort direction",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";
}

export interface SearchResultItem {
  id: string | number;
  type: "card" | "tournament" | "player" | "marketplace";
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
