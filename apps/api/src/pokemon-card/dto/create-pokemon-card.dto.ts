import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { PokemonCardsType } from 'src/common/enums/pokemonCardsType';
import { EnergyType } from 'src/common/enums/energyType';
import { TrainerType } from 'src/common/enums/trainerType';

class SetRefDto {
  @IsString()
  id: string;
}

export class CreatePokemonCardDto {
  @IsOptional()
  @IsString()
  tcgDexId?: string;

  @IsOptional()
  @IsString()
  localId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsEnum(PokemonCardsType)
  category?: PokemonCardsType;

  @IsOptional()
  @IsString()
  illustrator?: string;

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SetRefDto)
  set?: SetRefDto;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  dexId?: number[];

  @IsOptional()
  @IsInt()
  hp?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  regulationMark?: string;

  @IsOptional()
  @IsEnum(TrainerType)
  trainerType?: TrainerType;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;
}
