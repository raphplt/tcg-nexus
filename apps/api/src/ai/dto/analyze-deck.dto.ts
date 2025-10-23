import {
  IsOptional,
  IsNumber,
  IsArray,
  IsString,
  ValidateIf
} from 'class-validator';

export class AnalyzeDeckDto {
  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.cardIds || o.cardIds.length === 0)
  deckId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ValidateIf((o) => !o.deckId)
  cardIds?: string[];
}
