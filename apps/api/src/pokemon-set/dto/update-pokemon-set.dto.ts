import { PartialType } from "@nestjs/swagger";
import { CreatePokemonSetDto } from "./create-pokemon-set.dto";

/**
 * Payload for updating existing Pokémon expansion set attributes.
 */
export class UpdatePokemonSetDto extends PartialType(CreatePokemonSetDto) {}
