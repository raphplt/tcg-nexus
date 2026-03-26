import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class SerieRefDto {
  @IsString()
  id: string;
}

class CardCountDto {
  @IsOptional()
  @IsInt()
  total?: number;

  @IsOptional()
  @IsInt()
  official?: number;

  @IsOptional()
  @IsInt()
  reverse?: number;

  @IsOptional()
  @IsInt()
  holo?: number;

  @IsOptional()
  @IsInt()
  firstEd?: number;
}

class LegalDto {
  @IsOptional()
  @IsBoolean()
  standard?: boolean;

  @IsOptional()
  @IsBoolean()
  expanded?: boolean;
}

export class CreatePokemonSetDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  tcgOnline?: string;

  @IsOptional()
  @IsString()
  releaseDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SerieRefDto)
  serie?: SerieRefDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardCountDto)
  cardCount?: CardCountDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LegalDto)
  legal?: LegalDto;
}
