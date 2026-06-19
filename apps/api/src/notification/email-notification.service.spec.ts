import { Test, TestingModule } from "@nestjs/testing";
import { MailerService } from "@nestjs-modules/mailer";
import { EmailNotificationService } from "./email-notification.service";

describe("EmailNotificationService", () => {
  let service: EmailNotificationService;
  const mailerService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationService,
        { provide: MailerService, useValue: mailerService },
      ],
    }).compile();
    service = module.get<EmailNotificationService>(EmailNotificationService);
  });

  it("sendCritical delegates to MailerService with template and context", async () => {
    await service.sendCritical(
      "user@test.com",
      "Tournoi démarré",
      "tournament-started",
      { name: "Cup", link: "/tournaments/1" },
    );
    expect(mailerService.sendMail).toHaveBeenCalledWith({
      to: "user@test.com",
      subject: "Tournoi démarré",
      template: "tournament-started",
      context: { name: "Cup", link: "/tournaments/1" },
    });
  });

  it("sendCritical swallows mailer errors and resolves", async () => {
    mailerService.sendMail.mockRejectedValueOnce(new Error("SMTP down"));
    await expect(
      service.sendCritical("a@b.c", "x", "t", {}),
    ).resolves.toBeUndefined();
  });
});
