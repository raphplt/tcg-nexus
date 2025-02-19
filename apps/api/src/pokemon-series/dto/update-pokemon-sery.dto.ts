import { PartialType } from '@nestjs/mapped-types';
import { CreatePokemonSeryDto } from './create-pokemon-sery.dto';

export class UpdatePokemonSeryDto extends PartialType(CreatePokemonSeryDto) {}
