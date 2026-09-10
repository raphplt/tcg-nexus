import { PartialType } from "@nestjs/swagger";
import { CreateRankingDto } from "./create-ranking.dto";

/**
 * Payload for updating existing tournament player ranking records.
 */
export class UpdateRankingDto extends PartialType(CreateRankingDto) {}
