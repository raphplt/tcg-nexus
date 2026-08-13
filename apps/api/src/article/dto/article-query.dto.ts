import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** Query parameters accepted by the public article list. */
export class ArticleQueryDto {
  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}

/** Query parameters accepted by the editorial article list. */
export class AdminArticleQueryDto extends ArticleQueryDto {
  @IsOptional()
  @IsIn(["draft", "published"])
  status?: "draft" | "published";
}
