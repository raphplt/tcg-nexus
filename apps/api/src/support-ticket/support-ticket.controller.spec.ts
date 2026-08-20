import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../user/entities/user.entity";
import { SupportTicketController } from "./support-ticket.controller";
import { SupportTicketService } from "./support-ticket.service";

describe("SupportTicketController", () => {
  let controller: SupportTicketController;

  const mockSupportTicketService = {
    create: jest.fn(),
    addMessage: jest.fn(),
    findAll: jest.fn(),
    findOneWithMessages: jest.fn(),
    getMessages: jest.fn(),
    closeTicket: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportTicketController],
      providers: [
        {
          provide: SupportTicketService,
          useValue: mockSupportTicketService,
        },
      ],
    }).compile();

    controller = module.get<SupportTicketController>(SupportTicketController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create support ticket", async () => {
    const user = { id: 1 } as User;
    const dto = { subject: "Issue", message: "Details" };
    mockSupportTicketService.create.mockResolvedValue({ id: 1 });

    const result = await controller.create(user, dto);
    expect(result).toEqual({ id: 1 });
    expect(mockSupportTicketService.create).toHaveBeenCalledWith(user, dto);
  });

  it("should add message to ticket", async () => {
    const user = { id: 1 } as User;
    const dto = { message: "Reply" };
    mockSupportTicketService.addMessage.mockResolvedValue({ id: 10 });

    const result = await controller.addMessage(1, user, dto);
    expect(result).toEqual({ id: 10 });
    expect(mockSupportTicketService.addMessage).toHaveBeenCalledWith(
      1,
      user,
      dto,
    );
  });

  it("should list tickets", async () => {
    const user = { id: 1 } as User;
    mockSupportTicketService.findAll.mockResolvedValue({ data: [], meta: {} });

    const result = await controller.findAll(user, 1, 10);
    expect(result).toEqual({ data: [], meta: {} });
    expect(mockSupportTicketService.findAll).toHaveBeenCalledWith(user, 1, 10);
  });

  it("should find ticket with messages", async () => {
    const user = { id: 1 } as User;
    mockSupportTicketService.findOneWithMessages.mockResolvedValue({
      id: 1,
      messages: [],
    });

    const result = await controller.findOne(1, user, 20);
    expect(result).toEqual({ id: 1, messages: [] });
    expect(mockSupportTicketService.findOneWithMessages).toHaveBeenCalledWith(
      1,
      user,
      20,
    );
  });

  it("should get ticket messages", async () => {
    const user = { id: 1 } as User;
    mockSupportTicketService.getMessages.mockResolvedValue({
      data: [],
      meta: {},
    });

    const result = await controller.getMessages(1, user, 1, 10);
    expect(result).toEqual({ data: [], meta: {} });
    expect(mockSupportTicketService.getMessages).toHaveBeenCalledWith(
      1,
      user,
      1,
      10,
    );
  });

  it("should close ticket", async () => {
    const user = { id: 1 } as User;
    mockSupportTicketService.closeTicket.mockResolvedValue({
      id: 1,
      status: "closed",
    });

    const result = await controller.closeTicket("1", user);
    expect(result).toEqual({ id: 1, status: "closed" });
    expect(mockSupportTicketService.closeTicket).toHaveBeenCalledWith(1, user);
  });
});
