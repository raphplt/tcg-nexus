import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendTicketCreated(to: string, ticketId: number, subject: string) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `[TCG Nexus] Ticket #${ticketId} créé : ${subject}`,
        template: 'ticket-created',
        context: { ticketId, subject },
      });
      this.logger.log(`Email ticket-created envoyé à ${to}`);
    } catch (error) {
      this.logger.warn(`Failed to send ticket-created email to ${to}: ${error}`);
    }
  }

  async sendTicketReply(
    to: string,
    ticketId: number,
    ticketSubject: string,
    senderName: string,
    messagePreview: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: `[TCG Nexus] Nouvelle réponse sur le ticket #${ticketId} : ${ticketSubject}`,
        template: 'ticket-reply',
        context: { ticketId, ticketSubject, senderName, messagePreview },
      });
      this.logger.log(`Email ticket-reply envoyé à ${to}`);
    } catch (error) {
      this.logger.warn(`Failed to send ticket-reply email to ${to}: ${error}`);
    }
  }
}
