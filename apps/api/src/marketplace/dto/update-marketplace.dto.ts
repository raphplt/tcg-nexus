import { PartialType } from "@nestjs/swagger";
import { CreateListingDto } from "./create-marketplace.dto";

/**
 * Data transfer object for partially updating an existing marketplace listing.
 */
export class UpdateListingDto extends PartialType(CreateListingDto) {}
