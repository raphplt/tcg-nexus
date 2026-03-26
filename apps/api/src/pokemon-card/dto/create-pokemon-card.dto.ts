import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsObject,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { PokemonCardsType } from 'src/common/enums/pokemonCardsType';
import { EnergyType } from 'src/common/enums/energyType';
import { TrainerType } from 'src/common/enums/trainerType';
import { CardPricingData } from 'src/card/entities/card.entity';

class SetRefDto {
  @IsString()
  id: string;
}

class VariantDetailDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  foil?: string;

  @IsOptional()
  @IsString()
  stamp?: string;

  @IsOptional()
  @IsString()
  subtype?: string;
}

class AbilityDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  effect?: string;
}

class AttackDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cost?: string[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  effect?: string;

  @IsOptional()
  damage?: string | number;
}

class WeaknessResistanceDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  value?: string;
}

class ItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  effect?: string;
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
  @IsObject()
  variants?: Record<string, boolean>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDetailDto)
  variantsDetailed?: VariantDetailDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SetRefDto)
  set?: SetRefDto;

  @IsOptional()
  @IsString()
  setId?: string;

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
  effect?: string;

  @IsOptional()
  @IsString()
  regulationMark?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsString()
  evolveFrom?: string;

  @IsOptional()
  @IsObject()
  item?: ItemDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbilityDto)
  abilities?: AbilityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackDto)
  attacks?: AttackDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeaknessResistanceDto)
  weaknesses?: WeaknessResistanceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeaknessResistanceDto)
  resistances?: WeaknessResistanceDto[];

  @IsOptional()
  @IsInt()
  retreat?: number;

  @IsOptional()
  @IsEnum(TrainerType)
  trainerType?: TrainerType;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsObject()
  legal?: { standard: boolean; expanded: boolean };

  @IsOptional()
  @IsString()
  updated?: string;

  @IsOptional()
  @IsObject()
  pricing?: CardPricingData;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  boosters?: { id?: string; name?: string }[];
}
