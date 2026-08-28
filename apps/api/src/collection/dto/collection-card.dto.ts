import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Body of the add and remove card endpoints of a collection.
 *
 * NOTE: the identifier must be validated here. Read straight from the raw body,
 * an absent value reached `findOne({ where: { id: undefined } })`, where TypeORM
 * drops the empty criterion and returns the first row of the table — the API
 * answered 201 and filed an arbitrary card into the collection.
 */
export class CollectionCardDto {
  @ApiProperty({ description: "Identifier of the card to add or remove" })
  @IsUUID()
  pokemonCardId: string;
}
