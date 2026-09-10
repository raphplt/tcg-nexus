import { PartialType } from "@nestjs/swagger";
import { CreatePokemonCardDto } from "./create-pokemon-card.dto";

/**
 * Payload for updating existing Pokémon card attributes.
 */
export class UpdatePokemonCardDto extends PartialType(CreatePokemonCardDto) {}
