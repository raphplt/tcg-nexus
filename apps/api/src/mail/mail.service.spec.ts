import { MailerService } from "@nestjs-modules/mailer";
import { Test, TestingModule } from "@nestjs/testing";
import { MailI18nService } from "./mail-i18n.service";
import { MailService } from "./mail.service";

describe("MailService", () => {
  let service: MailService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockI18n = {
    subject: jest.fn().mockReturnValue("Subject"),
    texts: jest.fn().mockReturnValue({}),
    resolveLocale: jest.fn().mockReturnValue("en"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: MailI18nService,
          useValue: mockI18n,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendTicketCreated", () => {
    it("should send ticket created email", async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);
      await service.sendTicketCreated("test@tcg.org", 1, "Question", "en");
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@tcg.org",
          template: "ticket-created",
        }),
      );
    });

    it("should handle email send failure without throwing", async () => {
      mockMailerService.sendMail.mockRejectedValueOnce(
        new Error("SMTP offline"),
      );
      await expect(
        service.sendTicketCreated("test@tcg.org", 1, "Question", "en"),
      ).resolves.toBeUndefined();
    });
  });

  describe("sendTicketReply", () => {
    it("should send ticket reply email", async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);
      await service.sendTicketReply(
        "test@tcg.org",
        1,
        "Question",
        "Staff",
        "Preview msg",
        "en",
      );
      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@tcg.org",
          template: "ticket-reply",
        }),
      );
    });
  });
});
