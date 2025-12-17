import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FaqCategory } from '../entities/faq.entity';

export class GetFaqDto {
  @ApiPropertyOptional({
    enum: FaqCategory,
    description: 'Filtrer par catégorie'
  })
  @IsOptional()
  @IsEnum(FaqCategory)
  category?: FaqCategory;

  @ApiPropertyOptional({
    description: 'Recherche par mots-clés dans la question/réponse'
  })
  @IsOptional()
  @IsString()
  search?: string;
}
