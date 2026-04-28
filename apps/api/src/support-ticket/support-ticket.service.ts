import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {SupportTicket} from "./entities/support-ticket.entity";
import {SupportMessage} from "../support-message/entities/support-message.entity";
import {Repository} from "typeorm";
import {User} from "../user/entities/user.entity";
import {CreateSupportMessageDto} from "./dto/create-support-message.dto";
import {SupportTicketStatusType} from "../common/enums/supportTicketType";
import {UserRole} from "../common/enums/user";
import {MailService} from "../mail/mail.service";

@Injectable()
export class SupportTicketService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,

    @InjectRepository(SupportMessage)
    private readonly messageRepo: Repository<SupportMessage>,

    private readonly mailService: MailService,
  ) {}

  private isStaff(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR;
  }

  private assertOwnerOrStaff(ticket: SupportTicket, user: User) {
    if (!this.isStaff(user) && ticket.user.id !== user.id) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce ticket');
    }
  }

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
      isStaff: this.isStaff(user),
    });
    await this.messageRepo.save(initialMessage);

    // Notification email à l'utilisateur
    this.mailService.sendTicketCreated(user.email, savedTicket.id, savedTicket.subject);

    return savedTicket;
  }

  async addMessage(ticketId: number, user: User, dto: CreateSupportMessageDto) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertOwnerOrStaff(ticket, user);

    if (ticket.status === SupportTicketStatusType.closed) {
      throw new ForbiddenException('Ce ticket est fermé');
    }

    const message = this.messageRepo.create({
      supportTicket: ticket,
      user,
      message: dto.message,
      isStaff: this.isStaff(user),
    });

    const savedMessage = await this.messageRepo.save(message);

    // Notification email : notifier l'autre partie
    const senderName = `${user.firstName} ${user.lastName}`;
    const preview = dto.message.length > 200 ? dto.message.slice(0, 200) + '...' : dto.message;

    if (this.isStaff(user)) {
      // Staff répond -> notifier l'utilisateur propriétaire du ticket
      this.mailService.sendTicketReply(
        ticket.user.email, ticketId, ticket.subject, senderName, preview,
      );
    }
    // Utilisateur répond -> pas de notification auto (le staff consulte le dashboard)

    return savedMessage;
  }

  async findAll(user: User, page = 1, limit = 20) {
    const query = this.ticketRepo.createQueryBuilder('ticket');

    if (!this.isStaff(user)) {
      query.where('ticket.userId = :userId', { userId: user.id });
    }

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

  async findOneWithMessages(ticketId: number, user: User, messagesLimit = 50) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertOwnerOrStaff(ticket, user);

    const messages = await this.messageRepo.find({
      where: { supportTicket: { id: ticketId } },
      order: { createdAt: 'ASC' },
      take: messagesLimit,
      relations: ['user'],
    });

    return {
      ...ticket,
      messages,
    };
  }

  async getMessages(ticketId: number, user: User, page = 1, limit = 20) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    this.assertOwnerOrStaff(ticket, user);

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
    this.assertOwnerOrStaff(ticket, user);

    ticket.status = SupportTicketStatusType.closed;
    return this.ticketRepo.save(ticket);
  }
}
