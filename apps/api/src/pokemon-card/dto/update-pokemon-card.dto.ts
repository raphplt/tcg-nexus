import { PartialType } from '@nestjs/mapped-types';
import { CreatePokemonCardDto } from './create-pokemon-card.dto';

export class UpdatePokemonCardDto extends PartialType(CreatePokemonCardDto) {}
