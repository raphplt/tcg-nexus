import { PartialType } from '@nestjs/mapped-types';
import { CreatePokemonSetDto } from './create-pokemon-set.dto';

export class UpdatePokemonSetDto extends PartialType(CreatePokemonSetDto) {}
