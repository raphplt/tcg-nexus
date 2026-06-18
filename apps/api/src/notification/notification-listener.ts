import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { UserService } from "../user/user.service";
import { EmailNotificationService } from "./email-notification.service";
import { NotificationService } from "./notification.service";

export interface TournamentStartedPayload {
  tournamentId: number;
  name: string;
  participantUserIds: number[];
}
export interface TournamentFinishedPayload {
  tournamentId: number;
  name: string;
  rankings: { userId: number; rank: number }[];
}
export interface TournamentMatchReminderPayload {
  tournamentId: number;
  matchId: number;
  userId: number;
}
export interface MatchReadyPayload {
  matchId: number;
  tournamentId: number;
  playerAUserId: number | null;
  playerBUserId: number | null;
}
export interface BadgeUnlockedPayload {
  userId: number;
  badgeName: string;
  badgeCode: string;
}
export interface FollowCreatedPayload {
  followerUserId: number;
  followedUserId: number;
  followerName: string;
}
export interface FollowRemovedPayload {
  followerUserId: number;
  followedUserId: number;
  followerName: string;
}
export interface MarketplaceSalePayload {
  sellerUserId: number;
  buyerUserId: number;
  orderId: number;
  total: number;
}
export interface OrderShippedPayload {
  buyerUserId: number;
  orderId: number;
  trackingNumber?: string;
}

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailNotificationService,
    private readonly userService: UserService,
  ) {}

  private async safeCreate(
    userId: number,
    title: string,
    body: string,
    type: string,
    data: Record<string, any>,
  ): Promise<void> {
    try {
      await this.notificationService.createNotification(
        userId,
        title,
        body,
        type,
        data,
      );
    } catch (err) {
      this.logger.error(
        `createNotification failed for user ${userId} (${type}): ${(err as Error).message}`,
      );
    }
  }

  private async sendEmailToUser(
    userId: number,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      if (!user?.email) return;
      await this.emailService.sendCritical(
        user.email,
        subject,
        template,
        context,
      );
    } catch (err) {
      this.logger.error(
        `sendEmailToUser failed for user ${userId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent("tournament.started")
  async onTournamentStarted(payload: TournamentStartedPayload): Promise<void> {
    const link = `/tournaments/${payload.tournamentId}`;
    for (const userId of payload.participantUserIds) {
      await this.safeCreate(
        userId,
        "Tournoi démarré",
        `Le tournoi "${payload.name}" a démarré.`,
        "tournament.started",
        { link, tournamentId: payload.tournamentId },
      );
      await this.sendEmailToUser(
        userId,
        "Votre tournoi a démarré",
        "tournament-started",
        { name: payload.name, link },
      );
    }
  }

  @OnEvent("tournament.finished")
  async onTournamentFinished(
    payload: TournamentFinishedPayload,
  ): Promise<void> {
    const link = `/tournaments/${payload.tournamentId}`;
    for (const entry of payload.rankings) {
      await this.safeCreate(
        entry.userId,
        "Tournoi terminé",
        `Résultats du tournoi "${payload.name}" disponibles.`,
        "tournament.finished",
        { link, tournamentId: payload.tournamentId, rank: entry.rank },
      );
      await this.sendEmailToUser(
        entry.userId,
        "Résultats du tournoi",
        "tournament-finished",
        { name: payload.name, link, rank: entry.rank },
      );
    }
  }

  @OnEvent("tournament.match_reminder")
  async onTournamentMatchReminder(
    payload: TournamentMatchReminderPayload,
  ): Promise<void> {
    const link = `/tournaments/${payload.tournamentId}/matches/${payload.matchId}`;
    await this.safeCreate(
      payload.userId,
      "Match demain",
      "Vous avez un match prévu demain.",
      "tournament.match_reminder",
      { link, tournamentId: payload.tournamentId, matchId: payload.matchId },
    );
    await this.sendEmailToUser(
      payload.userId,
      "Rappel: votre match est demain",
      "match-reminder",
      { link },
    );
  }

  @OnEvent("match.ready")
  async onMatchReady(payload: MatchReadyPayload): Promise<void> {
    const link = `/tournaments/${payload.tournamentId}/matches/${payload.matchId}`;
    const data = {
      link,
      tournamentId: payload.tournamentId,
      matchId: payload.matchId,
    };
    if (payload.playerAUserId) {
      await this.safeCreate(
        payload.playerAUserId,
        "Match prêt",
        "Votre match peut commencer.",
        "match.ready",
        data,
      );
    }
    if (payload.playerBUserId) {
      await this.safeCreate(
        payload.playerBUserId,
        "Match prêt",
        "Votre match peut commencer.",
        "match.ready",
        data,
      );
    }
  }

  @OnEvent("badge.unlocked")
  async onBadgeUnlocked(payload: BadgeUnlockedPayload): Promise<void> {
    await this.safeCreate(
      payload.userId,
      "Nouveau badge débloqué",
      `Vous avez obtenu le badge "${payload.badgeName}".`,
      "badge.unlocked",
      { link: "/profile", badgeCode: payload.badgeCode },
    );
  }

  @OnEvent("follow.created")
  async onFollowCreated(payload: FollowCreatedPayload): Promise<void> {
    await this.safeCreate(
      payload.followedUserId,
      "Nouveau follower",
      `${payload.followerName} vous suit désormais.`,
      "follow.created",
      { link: `/users/${payload.followerUserId}` },
    );
  }

  @OnEvent("follow.removed")
  async onFollowRemoved(payload: FollowRemovedPayload): Promise<void> {
    await this.safeCreate(
      payload.followedUserId,
      "Vous avez perdu un follower",
      `${payload.followerName} ne vous suit plus.`,
      "follow.removed",
      { link: `/users/${payload.followerUserId}` },
    );
  }

  @OnEvent("marketplace.sale")
  async onMarketplaceSale(payload: MarketplaceSalePayload): Promise<void> {
    const link = `/marketplace/orders/${payload.orderId}`;
    await this.safeCreate(
      payload.sellerUserId,
      "Vente réalisée",
      `Vous avez vendu pour ${payload.total} €.`,
      "marketplace.sale",
      { link, orderId: payload.orderId, total: payload.total },
    );
    await this.sendEmailToUser(
      payload.sellerUserId,
      "Vente réalisée",
      "marketplace-sale",
      { orderId: payload.orderId, total: payload.total, link },
    );
  }

  @OnEvent("order.shipped")
  async onOrderShipped(payload: OrderShippedPayload): Promise<void> {
    const link = `/marketplace/orders/${payload.orderId}`;
    await this.safeCreate(
      payload.buyerUserId,
      "Commande expédiée",
      "Votre commande a été expédiée.",
      "order.shipped",
      {
        link,
        orderId: payload.orderId,
        trackingNumber: payload.trackingNumber,
      },
    );
    await this.sendEmailToUser(
      payload.buyerUserId,
      "Votre commande a été expédiée",
      "order-shipped",
      {
        orderId: payload.orderId,
        trackingNumber: payload.trackingNumber,
        link,
      },
    );
  }
}
