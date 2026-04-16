import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
import { Notification, NotificationType } from "./entities/notification.entity";
import { MailService } from "./mail.service";

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  @OnEvent("tournament.registration.confirmed")
  async handleRegistrationConfirmed(payload: { userId: number; tournamentName: string }) {
    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) return;

    // Create In-App Notification
    await this.createNotification(
      user,
      "Inscription validée",
      `Votre inscription au tournoi "${payload.tournamentName}" a été confirmée.`,
      NotificationType.TOURNAMENT_REGISTRATION_CONFIRMED,
    );

    // Send Email
    await this.mailService.sendTournamentRegistrationConfirmed(user.email, payload.tournamentName);
  }

  @OnEvent("tournament.started")
  async handleTournamentStarted(payload: { userIds: number[]; tournamentName: string }) {
    for (const userId of payload.userIds) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) continue;

      await this.createNotification(
        user,
        "Début du tournoi",
        `Le tournoi "${payload.tournamentName}" vient de commencer !`,
        NotificationType.TOURNAMENT_STARTED,
      );

      await this.mailService.sendTournamentStarted(user.email, payload.tournamentName);
    }
  }

  @OnEvent("match.assigned")
  async handleMatchAssigned(payload: { userId: number; tournamentName: string; opponentName: string }) {
    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user) return;

    await this.createNotification(
      user,
      "Nouveau match",
      `Vous avez un match contre ${payload.opponentName} dans le tournoi "${payload.tournamentName}".`,
      NotificationType.MATCH_ASSIGNED,
    );

    await this.mailService.sendMatchAssigned(user.email, payload.tournamentName, payload.opponentName);
  }

  @OnEvent("tournament.finished")
  async handleTournamentFinished(payload: { results: { userId: number; rank: number }[]; tournamentName: string }) {
    for (const result of payload.results) {
      const user = await this.userRepository.findOne({ where: { id: result.userId } });
      if (!user) continue;

      await this.createNotification(
        user,
        "Tournoi terminé",
        `Le tournoi "${payload.tournamentName}" est terminé. Vous avez terminé au rang ${result.rank}.`,
        NotificationType.TOURNAMENT_RESULT,
      );

      await this.mailService.sendTournamentResult(user.email, payload.tournamentName, result.rank);
    }
  }

  private async createNotification(user: User, title: string, message: string, type: NotificationType) {
    const notification = this.notificationRepository.create({
      user,
      title,
      message,
      type,
    });
    return this.notificationRepository.save(notification);
  }

  async findAllForUser(userId: number) {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: "DESC" },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (notification) {
      notification.isRead = true;
      return this.notificationRepository.save(notification);
    }
    return null;
  }
}
