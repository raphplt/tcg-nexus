import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {SupportTicket} from "./entities/support-ticket.entity";
import {SupportMessage} from "../support-message/entities/support-message.entity";
import {Repository} from "typeorm";
import {User} from "../user/entities/user.entity";
import {CreateSupportMessageDto} from "./dto/create-support-message.dto";
import {SupportTicketStatusType} from "../common/enums/supportTicketType";

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,

    @InjectRepository(SupportMessage)
    private readonly messageRepo: Repository<SupportMessage>,
  ) {}

  async create(user: User, dto: CreateSupportTicketDto) {
    const ticket = this.ticketRepo.create({
      user,
      subject: dto.subject,
      message: dto.message,
      status: SupportTicketStatusType.opened,
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    const initialMessage = this.messageRepo.create({
      supportTicket: savedTicket,
      user,
      message: dto.message,
      // isStaff: user.isStaff,
    });
    await this.messageRepo.save(initialMessage);

    return savedTicket;
  }

  async addMessage(ticketId: number, user: User, dto: CreateSupportMessageDto) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // if (!user.isStaff && ticket.user.id !== user.id) {
    //   throw new ForbiddenException();
    // }

    const message = this.messageRepo.create({
      supportTicket: ticket,
      user,
      message: dto.message,
      // isStaff: user.isStaff,
    });

    return this.messageRepo.save(message);
  }

  async findAll(user: User, page = 1, limit = 20) {
    const query = this.ticketRepo.createQueryBuilder('ticket');

    // if (!user.isStaff) {
    //   query.where('ticket.userId = :userId', { userId: user.id });
    // }

    query
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOneWithMessages(ticketId: number, user: User, messagesLimit = 20) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // if (!user.isStaff && ticket.user.id !== user.id) {
    //   throw new ForbiddenException();
    // }

    const messages = await this.messageRepo.find({
      where: { supportTicket: { id: ticketId } },
      order: { createdAt: 'DESC' },
      take: messagesLimit,
      relations: ['user'],
    });

    return {
      ...ticket,
      messages: messages.reverse(),
    };
  }

  async getMessages(ticketId: number, user: User, page = 1, limit = 20) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // if (!user.isStaff && ticket.user.id !== user.id) {
    //   throw new ForbiddenException();
    // }

    const [data, total] = await this.messageRepo.findAndCount({
      where: { supportTicket: { id: ticketId } },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async closeTicket(ticketId: number, user: User) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    // if (!user.isStaff && ticket.user.id !== user.id) {
    //   throw new ForbiddenException();
    // }

    ticket.status = SupportTicketStatusType.closed;
    return this.ticketRepo.save(ticket);
  }
}
