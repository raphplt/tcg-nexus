import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { FaqCategory } from "../entities/faq.entity";

/**
 * Query parameters for filtering FAQ entries by category or search term.
 */
export class GetFaqDto {
  @ApiPropertyOptional({
    enum: FaqCategory,
    description: "Filter by FAQ category",
  })
  @IsOptional()
  @IsEnum(FaqCategory)
  category?: FaqCategory;

  @ApiPropertyOptional({
    description: "Keyword search across questions and answers",
    example: "delivery",
  })
  @IsOptional()
  @IsString()
  search?: string;
}
