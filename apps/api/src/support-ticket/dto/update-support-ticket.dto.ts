import { PartialType } from "@nestjs/swagger";
import { CreateSupportTicketDto } from "./create-support-ticket.dto";

/**
 * Payload for updating existing support ticket attributes.
 */
export class UpdateSupportTicketDto extends PartialType(
  CreateSupportTicketDto,
) {}
