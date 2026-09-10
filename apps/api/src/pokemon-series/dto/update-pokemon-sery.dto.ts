import { PartialType } from "@nestjs/swagger";
import { CreatePokemonSeryDto } from "./create-pokemon-sery.dto";

/**
 * Payload for updating existing Pokémon card series attributes.
 */
export class UpdatePokemonSeryDto extends PartialType(CreatePokemonSeryDto) {}
