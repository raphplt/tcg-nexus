import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async sendMail(to: string, subject: string, content: string) {
    // In a real application, you would use a service like SendGrid, AWS SES or Nodemailer.
    // For now, we simulate the sending by logging to the console.
    this.logger.log(`Sending email to ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Content: ${content}`);

    // Placeholder for SendGrid/Nodemailer implementation
    const apiKey = this.configService.get("SENDGRID_API_KEY");
    if (apiKey) {
      // Logic for SendGrid integration would go here
    }
    
    return true;
  }

  async sendTournamentRegistrationConfirmed(to: string, tournamentName: string) {
    const subject = `Confirmation d'inscription: ${tournamentName}`;
    const content = `Votre inscription au tournoi "${tournamentName}" a été validée. Bonne chance !`;
    return this.sendMail(to, subject, content);
  }

  async sendTournamentStarted(to: string, tournamentName: string) {
    const subject = `Le tournoi commence: ${tournamentName}`;
    const content = `Le tournoi "${tournamentName}" a commencé ! Consultez vos matches en ligne.`;
    return this.sendMail(to, subject, content);
  }

  async sendMatchAssigned(to: string, tournamentName: string, opponentName: string) {
    const subject = `Nouveau match assigné: ${tournamentName}`;
    const content = `Vous avez un nouveau match contre ${opponentName} dans le tournoi "${tournamentName}".`;
    return this.sendMail(to, subject, content);
  }

  async sendTournamentResult(to: string, tournamentName: string, rank: number) {
    const subject = `Résultats du tournoi: ${tournamentName}`;
    const content = `Le tournoi "${tournamentName}" est terminé. Vous avez terminé au rang: ${rank}.`;
    return this.sendMail(to, subject, content);
  }
}
