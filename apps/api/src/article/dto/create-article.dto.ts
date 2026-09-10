import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

/**
 * Payload used to create an editorial news or blog article.
 */
export class CreateArticleDto {
  @ApiProperty({
    description: "Article title",
    example: "Pokémon TCG World Championships Preview",
    minLength: 3,
    maxLength: 180,
  })
  @IsString()
  @Length(3, 180)
  title: string;

  @ApiPropertyOptional({
    description: "URL slug",
    example: "pokemon-tcg-world-championships-preview",
    maxLength: 180,
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiPropertyOptional({
    description: "Brief article summary",
    example: "Overview of key contenders and meta decks.",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @ApiPropertyOptional({
    description: "Cover image URL",
    example: "https://example.com/images/worlds.webp",
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  image?: string | null;

  @ApiPropertyOptional({
    description: "External reference link",
    example: "https://pokemon.com/news",
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  link?: string | null;

  @ApiPropertyOptional({
    description: "Full Markdown or HTML content of the article",
  })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({
    enum: ArticleStatus,
    description: "Publication status",
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional({
    description: "Locale code",
    example: "en",
    default: "fr",
  })
  @IsOptional()
  @IsIn(["fr", "en"])
  locale?: string;

  @ApiPropertyOptional({ description: "SEO meta title", maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  metaTitle?: string | null;

  @ApiPropertyOptional({ description: "SEO meta description", maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  @ApiPropertyOptional({
    description: "Publication date-time (ISO string)",
    example: "2026-09-10T12:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
