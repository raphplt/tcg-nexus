import {Controller, Get, Post, Body, Patch, Param, Req, Query, ParseIntPipe, UseGuards} from '@nestjs/common';
import { SupportTicketService } from './support-ticket.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {User} from "../user/entities/user.entity";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {ApiTags} from "@nestjs/swagger";

@ApiTags('support-tickets')
@Controller('support/tickets')
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: User,@Body() createSupportTicketDto: CreateSupportTicketDto) {
    return this.supportTicketService.create(user,createSupportTicketDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  async addMessage(
    @Param('id', ParseIntPipe) ticketId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportTicketService.addMessage(
      ticketId,
      user,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportTicketService.findAll(
      user,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Query('messagesLimit') messagesLimit = 20,
  ) {
    return this.supportTicketService.findOneWithMessages(
      id,
      user,
      Number(messagesLimit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) ticketId: number,
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.supportTicketService.getMessages(
      ticketId,
      user,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/close')
  closeTicket(@Param('id') id: string, @CurrentUser() user: User) {
    return this.supportTicketService.closeTicket(+id, user);
  }
}
