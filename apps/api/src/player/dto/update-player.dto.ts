import { PartialType } from "@nestjs/swagger";
import { CreatePlayerDto } from "./create-player.dto";

/**
 * Payload for updating an existing player profile.
 */
export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {}

