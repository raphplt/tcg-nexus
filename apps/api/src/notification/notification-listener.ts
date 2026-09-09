import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import { NotificationI18nService } from "./notification-i18n.service";
import { MailI18nService } from "../mail/mail-i18n.service";
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEventEnvelope } from "../common/events/domain-events";
import { EventConsumerService } from "../outbox/event-consumer.service";
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
export interface OrderRefundCreatedPayload {
  orderId: number;
  refundOperationId: number;
  buyerUserId: number;
  amount: number;
  currency?: string;
  reason?: string;
}
export interface OrderReturnRequestedPayload {
  orderId: number;
  returnItemId: number;
  orderItemId: number;
  buyerUserId: number;
  sellerUserId: number;
  reason: string;
}
export interface OrderItemDeliveredPayload {
  orderId: number;
  orderItemId: number;
  buyerUserId: number;
  sellerUserId: number;
}
export interface OrderItemClaimCreatedPayload {
  orderId: number;
  orderItemId: number;
  ticketId: number;
  buyerUserId: number;
  sellerUserId: number;
  category: string;
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
    private readonly consumers: EventConsumerService,
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
    // A recipient the event did not carry is a contract defect, not a delivery.
    if (!userId) {
      throw new Error(`Notification ${type} has no recipient`);
    }
    const user = await this.userService.findById(userId);
    const rendered = this.notificationI18n.render(
      type,
      user?.preferredLocale,
      params,
    );
    // Failures propagate: the dispatcher retries the event and the operational
    // metrics show what never reached its recipient.
    await this.notificationService.createNotification(
      userId,
      rendered.title,
      rendered.body,
      type,
      data,
      { key: type, params },
    );
  }

  private async sendEmailToUser(
    userId: number,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user?.email) return;
    const locale = user.preferredLocale;
    // Mail failures propagate for the same reason in-app ones do; the email
    // consumer keeps its own claim, so a retry does not repeat a notification
    // that already succeeded.
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
  }

  /**
   * Runs a directly emitted notification, reporting a failure rather than
   * rejecting into a void.
   *
   * Events dispatched through the outbox propagate instead, because the
   * dispatcher retries them and counts what never reached its recipient.
   */
  private async deliverDirect(
    eventName: string,
    work: () => Promise<void>,
  ): Promise<void> {
    try {
      await work();
    } catch (err) {
      this.logger.error(
        `Delivery of ${eventName} failed: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent("tournament.started")
  async onTournamentStarted(payload: TournamentStartedPayload): Promise<void> {
    await this.deliverDirect("tournament.started", async () => {
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
    });
  }

  @OnEvent("tournament.finished")
  async onTournamentFinished(
    payload: TournamentFinishedPayload,
  ): Promise<void> {
    await this.deliverDirect("tournament.finished", async () => {
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
    });
  }

  @OnEvent("tournament.match_reminder")
  async onTournamentMatchReminder(
    payload: TournamentMatchReminderPayload,
  ): Promise<void> {
    await this.deliverDirect("tournament.match_reminder", async () => {
      const link = `/tournaments/${payload.tournamentId}/matches/${payload.matchId}`;
      await this.safeCreate(payload.userId, "tournament.match_reminder", {
        link,
        tournamentId: payload.tournamentId,
        matchId: payload.matchId,
      });
      await this.sendEmailToUser(payload.userId, "match-reminder", { link });
    });
  }

  @OnEvent("match.ready")
  async onMatchReady(payload: MatchReadyPayload): Promise<void> {
    await this.deliverDirect("match.ready", async () => {
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
    });
  }

  @OnEvent("badge.unlocked")
  async onBadgeUnlocked(payload: BadgeUnlockedPayload): Promise<void> {
    await this.deliverDirect("badge.unlocked", async () => {
      await this.safeCreate(
        payload.userId,
        "badge.unlocked",
        { link: "/profile", badgeCode: payload.badgeCode },
        { badgeName: payload.badgeName },
      );
    });
  }

  @OnEvent("follow.created")
  async onFollowCreated(payload: FollowCreatedPayload): Promise<void> {
    await this.deliverDirect("follow.created", async () => {
      await this.safeCreate(
        payload.followedUserId,
        "follow.created",
        { link: `/users/${payload.followerUserId}` },
        { followerName: payload.followerName },
      );
    });
  }

  @OnEvent("follow.removed")
  async onFollowRemoved(payload: FollowRemovedPayload): Promise<void> {
    await this.deliverDirect("follow.removed", async () => {
      await this.safeCreate(
        payload.followedUserId,
        "follow.removed",
        { link: `/users/${payload.followerUserId}` },
        { followerName: payload.followerName },
      );
    });
  }

  @OnEvent("marketplace.sale")
  async onMarketplaceSale(payload: MarketplaceSalePayload): Promise<void> {
    await this.deliverDirect("marketplace.sale", async () => {
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
    });
  }

  @OnEvent("order.shipped")
  async onOrderShipped(payload: OrderShippedPayload): Promise<void> {
    await this.deliverDirect("order.shipped", async () => {
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
    });
  }

  @OnEvent("order.refund_created", { suppressErrors: false })
  async onOrderRefundCreated(
    payload: DomainEventEnvelope<"order.refund_created">,
  ): Promise<void> {
    await this.consumers.runOnce(
      "notification:order.refund_created",
      { eventId: payload.eventId, eventType: "order.refund_created" },
      async () => {
        const link = `/orders/${payload.orderId}`;
        const amount = this.formatAmount(payload.amount, payload.currency);
        await this.safeCreate(
          payload.buyerUserId,
          "order.refund_created",
          { link, orderId: payload.orderId, amount: payload.amount },
          { amount, orderId: payload.orderId },
        );
      },
    );
  }

  @OnEvent("order.return_requested", { suppressErrors: false })
  async onOrderReturnRequested(
    payload: DomainEventEnvelope<"order.return_requested">,
  ): Promise<void> {
    await this.consumers.runOnce(
      "notification:order.return_requested",
      { eventId: payload.eventId, eventType: "order.return_requested" },
      async () => {
        const link = `/orders/${payload.orderId}`;
        await this.safeCreate(
          payload.sellerUserId as number,
          "order.return_requested",
          {
            link,
            orderId: payload.orderId,
            returnItemId: payload.returnItemId,
          },
          { orderId: payload.orderId },
        );
      },
    );
  }

  @OnEvent("order.item_delivered", { suppressErrors: false })
  async onOrderItemDelivered(
    payload: DomainEventEnvelope<"order.item_delivered">,
  ): Promise<void> {
    await this.consumers.runOnce(
      "notification:order.item_delivered",
      { eventId: payload.eventId, eventType: "order.item_delivered" },
      async () => {
        const link = `/orders/${payload.orderId}`;
        await this.safeCreate(
          payload.sellerUserId as number,
          "order.item_delivered",
          { link, orderId: payload.orderId, orderItemId: payload.orderItemId },
          { orderId: payload.orderId },
        );
      },
    );
  }

  @OnEvent("order.item_claim_created", { suppressErrors: false })
  async onOrderItemClaimCreated(
    payload: DomainEventEnvelope<"order.item_claim_created">,
  ): Promise<void> {
    await this.consumers.runOnce(
      "notification:order.item_claim_created",
      { eventId: payload.eventId, eventType: "order.item_claim_created" },
      async () => {
        const link = `/orders/${payload.orderId}`;
        await this.safeCreate(
          payload.sellerUserId as number,
          "order.item_claim_created",
          { link, orderId: payload.orderId, ticketId: payload.ticketId },
          { orderId: payload.orderId },
        );
      },
    );
  }

  @OnEvent("payment.compensation_required", { suppressErrors: false })
  async onPaymentCompensationRequired(
    payload: DomainEventEnvelope<"payment.compensation_required">,
  ): Promise<void> {
    await this.consumers.runOnce(
      "notification:payment.compensation_required",
      { eventId: payload.eventId, eventType: "payment.compensation_required" },
      async () => {
        if (!payload.buyerUserId) return;
        const link = `/orders/${payload.orderId}`;
        const amount = this.formatAmount(
          payload.amount,
          payload.currency ?? "EUR",
        );
        await this.safeCreate(
          payload.buyerUserId,
          "payment.compensation_required",
          { link, orderId: payload.orderId, amount: payload.amount },
          { amount, orderId: payload.orderId },
        );
      },
    );
  }
}
