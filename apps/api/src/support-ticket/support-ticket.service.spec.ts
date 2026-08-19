import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SupportTicketStatusType } from "../common/enums/supportTicketType";
import { UserRole } from "../common/enums/user";
import { MailService } from "../mail/mail.service";
import { SupportMessage } from "../support-message/entities/support-message.entity";
import { User } from "../user/entities/user.entity";
import { SupportTicket } from "./entities/support-ticket.entity";
import { SupportTicketService } from "./support-ticket.service";

describe("SupportTicketService", () => {
  let service: SupportTicketService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockTicketRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockMessageRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn((entity) => Promise.resolve({ id: 10, ...entity })),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockMailService = {
    sendTicketCreated: jest.fn(),
    sendTicketReply: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketService,
        {
          provide: getRepositoryToken(SupportTicket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(SupportMessage),
          useValue: mockMessageRepo,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<SupportTicketService>(SupportTicketService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create ticket, initial message and send email confirmation", async () => {
      const user = {
        id: 1,
        email: "user@tcg.org",
        role: UserRole.USER,
        preferredLocale: "en",
      } as User;

      const result = await service.create(user, {
        subject: "Help with order",
        message: "Order did not arrive",
      });

      expect(result.id).toBe(1);
      expect(mockTicketRepo.save).toHaveBeenCalled();
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendTicketCreated).toHaveBeenCalledWith(
        "user@tcg.org",
        1,
        "Help with order",
        "en",
      );
    });
  });

  describe("addMessage", () => {
    it("should throw NotFoundException if ticket not found", async () => {
      mockTicketRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addMessage(999, { id: 1, role: UserRole.USER } as User, {
          message: "hello",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if user is not ticket owner and not staff", async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 2 },
        status: SupportTicketStatusType.opened,
      });

      await expect(
        service.addMessage(1, { id: 1, role: UserRole.USER } as User, {
          message: "hello",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if ticket is closed", async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 1 },
        status: SupportTicketStatusType.closed,
      });

      await expect(
        service.addMessage(1, { id: 1, role: UserRole.USER } as User, {
          message: "hello",
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should add message and notify user when staff replies", async () => {
      const staffUser = {
        id: 99,
        role: UserRole.ADMIN,
        firstName: "Staff",
        lastName: "Admin",
      } as User;

      mockTicketRepo.findOne.mockResolvedValue({
        id: 1,
        subject: "Help",
        user: { id: 1, email: "owner@tcg.org", preferredLocale: "en" },
        status: SupportTicketStatusType.opened,
      });

      const result = await service.addMessage(1, staffUser, {
        message: "We are looking into it.",
      });

      expect(result.id).toBe(10);
      expect(mockMailService.sendTicketReply).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return tickets with pagination for normal user", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);
      const result = await service.findAll({ id: 1, role: UserRole.USER } as User);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it("should return all tickets for admin without user filter", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 1 }], 1]);
      const result = await service.findAll({ id: 99, role: UserRole.ADMIN } as User);
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe("findOneWithMessages & getMessages", () => {
    it("should find ticket with messages", async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 1 },
      });
      mockMessageRepo.find.mockResolvedValue([{ id: 10, message: "msg" }]);

      const result = await service.findOneWithMessages(1, { id: 1, role: UserRole.USER } as User);
      expect(result.id).toBe(1);
      expect(result.messages).toHaveLength(1);
    });

    it("should paginate messages for a ticket", async () => {
      mockTicketRepo.findOne.mockResolvedValue({
        id: 1,
        user: { id: 1 },
      });
      mockMessageRepo.findAndCount.mockResolvedValue([[{ id: 10 }], 1]);

      const result = await service.getMessages(1, { id: 1, role: UserRole.USER } as User);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("closeTicket", () => {
    it("should close ticket when requested by owner", async () => {
      const ticket = { id: 1, user: { id: 1 }, status: SupportTicketStatusType.opened };
      mockTicketRepo.findOne.mockResolvedValue(ticket);

      const result = await service.closeTicket(1, { id: 1, role: UserRole.USER } as User);
      expect(result.status).toBe(SupportTicketStatusType.closed);
    });
  });
});
