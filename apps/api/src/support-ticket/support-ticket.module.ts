import { Module } from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import { SupportTicketController } from './support-ticket.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {SupportTicket} from "./entities/support-ticket.entity";
import {SupportMessage} from "../support-message/entities/support-message.entity";

@Module({
  controllers: [SupportTicketController],
  providers: [SupportTicketService],
  imports: [
    TypeOrmModule.forFeature([SupportTicket, SupportMessage]),
  ],
})
export class SupportTicketModule {}
