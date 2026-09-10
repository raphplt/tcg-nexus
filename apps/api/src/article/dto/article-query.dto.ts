import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * Query parameters accepted by the public article listing endpoint.
 */
export class ArticleQueryDto {
  @ApiPropertyOptional({ description: "Locale filter", example: "en", default: "fr" })
  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;

  @ApiPropertyOptional({ description: "Search query text matching title or excerpt", example: "World Championships" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Page number (1-based)", example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Offset index", example: 0 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: "Items per page", example: 12, default: 12, maximum: 50 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}

/**
 * Query parameters accepted by the editorial admin article list.
 */
export class AdminArticleQueryDto extends ArticleQueryDto {
  @ApiPropertyOptional({ description: "Filter by publication status", enum: ["draft", "published"] })
  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}
