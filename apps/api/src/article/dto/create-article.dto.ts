import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { ArticleStatus } from "../entities/article.entity";

/** Payload used to create an article. */
export class CreateArticleDto {
  @IsString()
  @Length(3, 180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  image?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  link?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
