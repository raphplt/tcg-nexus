import { PartialType } from "@nestjs/swagger";
import { CreateCollectionDto } from "./create-collection.dto";

/**
 * Payload for updating collection metadata.
 */
export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}
