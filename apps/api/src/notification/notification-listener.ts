import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import { NotificationI18nService } from "./notification-i18n.service";
import { MailI18nService } from "../mail/mail-i18n.service";
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
  currency?: string;
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
    private readonly mailI18n: MailI18nService,
    private readonly notificationI18n: NotificationI18nService,
  ) {}

  private formatAmount(
    amount: number,
    currency = "EUR",
    locale: string = DEFAULT_LOCALE,
  ): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }

  /**
   * `type` sert aussi de clé de traduction : title/body sont rendus dans la
   * langue du destinataire, et la clé est conservée pour un rendu ultérieur.
   */
  private async safeCreate(
    userId: number,
    type: string,
    data: Record<string, any>,
    params: Record<string, any> = {},
  ): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      const rendered = this.notificationI18n.render(
        type,
        user?.preferredLocale,
        params,
      );
      await this.notificationService.createNotification(
        userId,
        rendered.title,
        rendered.body,
        type,
        data,
        { key: type, params },
      );
    } catch (err) {
      this.logger.error(
        `createNotification failed for user ${userId} (${type}): ${(err as Error).message}`,
      );
    }
  }

  private async sendEmailToUser(
    userId: number,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      const user = await this.userService.findById(userId);
      if (!user?.email) return;
      const locale = user.preferredLocale;
      await this.emailService.sendCritical(
        user.email,
        this.mailI18n.subject(template, locale, context),
        template,
        {
          ...context,
          t: this.mailI18n.texts(template, locale),
          lang: this.mailI18n.resolveLocale(locale),
        },
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
        "tournament.started",
        { link, tournamentId: payload.tournamentId },
        { name: payload.name },
      );
      await this.sendEmailToUser(userId, "tournament-started", {
        name: payload.name,
        link,
      });
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
        "tournament.finished",
        { link, tournamentId: payload.tournamentId, rank: entry.rank },
        { name: payload.name },
      );
      await this.sendEmailToUser(entry.userId, "tournament-finished", {
        name: payload.name,
        link,
        rank: entry.rank,
      });
    }
  }

  @OnEvent("tournament.match_reminder")
  async onTournamentMatchReminder(
    payload: TournamentMatchReminderPayload,
  ): Promise<void> {
    const link = `/tournaments/${payload.tournamentId}/matches/${payload.matchId}`;
    await this.safeCreate(payload.userId, "tournament.match_reminder", {
      link,
      tournamentId: payload.tournamentId,
      matchId: payload.matchId,
    });
    await this.sendEmailToUser(payload.userId, "match-reminder", { link });
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
      await this.safeCreate(payload.playerAUserId, "match.ready", data);
    }
    if (payload.playerBUserId) {
      await this.safeCreate(payload.playerBUserId, "match.ready", data);
    }
  }

  @OnEvent("badge.unlocked")
  async onBadgeUnlocked(payload: BadgeUnlockedPayload): Promise<void> {
    await this.safeCreate(
      payload.userId,
      "badge.unlocked",
      { link: "/profile", badgeCode: payload.badgeCode },
      { badgeName: payload.badgeName },
    );
  }

  @OnEvent("follow.created")
  async onFollowCreated(payload: FollowCreatedPayload): Promise<void> {
    await this.safeCreate(
      payload.followedUserId,
      "follow.created",
      { link: `/users/${payload.followerUserId}` },
      { followerName: payload.followerName },
    );
  }

  @OnEvent("follow.removed")
  async onFollowRemoved(payload: FollowRemovedPayload): Promise<void> {
    await this.safeCreate(
      payload.followedUserId,
      "follow.removed",
      { link: `/users/${payload.followerUserId}` },
      { followerName: payload.followerName },
    );
  }

  @OnEvent("marketplace.sale")
  async onMarketplaceSale(payload: MarketplaceSalePayload): Promise<void> {
    const link = "/marketplace/sales";
    const amount = this.formatAmount(payload.total, payload.currency);
    await this.safeCreate(
      payload.sellerUserId,
      "marketplace.sale",
      { link, orderId: payload.orderId, total: payload.total },
      { amount },
    );
    await this.sendEmailToUser(payload.sellerUserId, "marketplace-sale", {
      orderId: payload.orderId,
      total: payload.total,
      link,
    });
  }

  @OnEvent("order.shipped")
  async onOrderShipped(payload: OrderShippedPayload): Promise<void> {
    const link = `/orders/${payload.orderId}`;
    await this.safeCreate(payload.buyerUserId, "order.shipped", {
      link,
      orderId: payload.orderId,
      trackingNumber: payload.trackingNumber,
    });
    await this.sendEmailToUser(payload.buyerUserId, "order-shipped", {
      orderId: payload.orderId,
      trackingNumber: payload.trackingNumber,
      link,
    });
  }
}
