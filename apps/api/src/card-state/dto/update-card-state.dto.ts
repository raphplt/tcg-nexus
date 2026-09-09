import { PartialType } from "@nestjs/swagger";
import { CreateCardStateDto } from "./create-card-state.dto";

/**
 * Payload for updating an existing card condition state.
 */
export class UpdateCardStateDto extends PartialType(CreateCardStateDto) {}
