import { PartialType } from '@nestjs/swagger';
import { CreateSupportTicketDto } from './create-support-ticket.dto';

export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {}
