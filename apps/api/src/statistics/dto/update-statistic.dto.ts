import { PartialType } from "@nestjs/swagger";
import { CreateStatisticDto } from "./create-statistic.dto";

/**
 * Payload for updating existing match performance statistics.
 */
export class UpdateStatisticDto extends PartialType(CreateStatisticDto) {}

