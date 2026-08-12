import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { MailI18nService } from "./mail-i18n.service";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: MailI18nService,
  ) {}

  async sendTicketCreated(
    to: string,
    ticketId: number,
    subject: string,
    locale?: string | null,
  ) {
    const template = "ticket-created";
    try {
      await this.mailerService.sendMail({
        to,
        subject: this.i18n.subject(template, locale, { ticketId, subject }),
        template,
        context: {
          ticketId,
          subject,
          t: this.i18n.texts(template, locale),
          lang: this.i18n.resolveLocale(locale),
        },
      });
      this.logger.log(`Email ticket-created envoyé à ${to}`);
    } catch (error) {
      this.logger.warn(
        `Failed to send ticket-created email to ${to}: ${error}`,
      );
    }
  }

  async sendTicketReply(
    to: string,
    ticketId: number,
    ticketSubject: string,
    senderName: string,
    messagePreview: string,
    locale?: string | null,
  ) {
    const template = "ticket-reply";
    try {
      await this.mailerService.sendMail({
        to,
        subject: this.i18n.subject(template, locale, {
          ticketId,
          ticketSubject,
        }),
        template,
        context: {
          ticketId,
          ticketSubject,
          senderName,
          messagePreview,
          t: this.i18n.texts(template, locale),
          lang: this.i18n.resolveLocale(locale),
        },
      });
      this.logger.log(`Email ticket-reply envoyé à ${to}`);
    } catch (error) {
      this.logger.warn(`Failed to send ticket-reply email to ${to}: ${error}`);
    }
  }
}
