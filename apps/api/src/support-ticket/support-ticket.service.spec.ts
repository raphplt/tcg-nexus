import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';
import { SupportMessage } from '../support-message/entities/support-message.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportTicketService } from './support-ticket.service';

describe('SupportTicketService', () => {
  let service: SupportTicketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketService,
        {
          provide: getRepositoryToken(SupportTicket),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SupportMessage),
          useValue: {},
        },
        {
          provide: MailService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SupportTicketService>(SupportTicketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
