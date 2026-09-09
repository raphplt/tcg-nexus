import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "../user/user.service";
import { EmailNotificationService } from "./email-notification.service";
import { NotificationService } from "./notification.service";
import { EventConsumerService } from "../outbox/event-consumer.service";
import { NotificationListener } from "./notification-listener";
import { NotificationI18nService } from "./notification-i18n.service";
import { MailI18nService } from "../mail/mail-i18n.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("NotificationListener", () => {
  let listener: NotificationListener;
  let consumers: {
    claims: string[];
    runOnce: jest.Mock;
  };
  const notificationService = {
    createNotification: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const emailService = {
    sendCritical: jest.fn().mockResolvedValue(undefined),
  };
  const userService = {
    findById: jest.fn().mockResolvedValue({ id: 1, email: "user@test.com" }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationService.createNotification.mockResolvedValue({ id: 1 });
    emailService.sendCritical.mockResolvedValue(undefined);
    userService.findById.mockResolvedValue({ id: 1, email: "user@test.com" });
    consumers = {
      claims: [] as string[],
      runOnce: jest.fn(
        async (consumer: string, _event, work: () => Promise<void>) => {
          consumers.claims.push(consumer);
          await work();
          return true;
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: EmailNotificationService, useValue: emailService },
        { provide: UserService, useValue: userService },
        MailI18nService,
        NotificationI18nService,
        { provide: EventConsumerService, useValue: consumers },
      ],
    }).compile();
    listener = module.get<NotificationListener>(NotificationListener);
  });

  it("handles tournament.started: notif + email per participant", async () => {
    await listener.onTournamentStarted({
      tournamentId: 5,
      name: "Cup",
      participantUserIds: [1, 2],
    });
    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      1,
      "Tournoi démarré",
      'Le tournoi "Cup" a démarré.',
      "tournament.started",
      { link: "/tournaments/5", tournamentId: 5 },
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(2);
  });

  it("handles tournament.finished with rank in data", async () => {
    await listener.onTournamentFinished({
      tournamentId: 5,
      name: "Cup",
      rankings: [
        { userId: 1, rank: 1 },
        { userId: 2, rank: 2 },
      ],
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      1,
      "Tournoi terminé",
      expect.stringContaining("Cup"),
      "tournament.finished",
      expect.objectContaining({ link: "/tournaments/5", rank: 1 }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(2);
  });

  it("handles tournament.match_reminder: notif + email for user", async () => {
    await listener.onTournamentMatchReminder({
      tournamentId: 5,
      matchId: 11,
      userId: 7,
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      7,
      "Match demain",
      expect.any(String),
      "tournament.match_reminder",
      expect.objectContaining({
        link: "/tournaments/5/matches/11",
        matchId: 11,
      }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(1);
  });

  it("handles match.ready: notif for both players, no email", async () => {
    await listener.onMatchReady({
      matchId: 11,
      tournamentId: 5,
      playerAUserId: 1,
      playerBUserId: 2,
    });
    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    expect(emailService.sendCritical).not.toHaveBeenCalled();
  });

  it("handles badge.unlocked: notif only", async () => {
    await listener.onBadgeUnlocked({
      userId: 7,
      badgeName: "Premier deck",
      badgeCode: "first_deck",
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      7,
      "Nouveau badge débloqué",
      expect.stringContaining("Premier deck"),
      "badge.unlocked",
      expect.objectContaining({
        link: "/profile",
        badgeCode: "first_deck",
      }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).not.toHaveBeenCalled();
  });

  it("handles follow.created: notif only", async () => {
    await listener.onFollowCreated({
      followerUserId: 1,
      followedUserId: 2,
      followerName: "Alice",
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      2,
      "Nouveau follower",
      expect.stringContaining("Alice"),
      "follow.created",
      expect.objectContaining({ link: "/users/1" }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).not.toHaveBeenCalled();
  });

  it("handles marketplace.sale: notif + email for seller", async () => {
    await listener.onMarketplaceSale({
      sellerUserId: 9,
      buyerUserId: 1,
      orderId: 42,
      total: 12.5,
      currency: "EUR",
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      9,
      "Vente réalisée",
      expect.any(String),
      "marketplace.sale",
      expect.objectContaining({ link: "/marketplace/sales", orderId: 42 }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(1);
  });

  it("formats the sale amount in the order currency", async () => {
    await listener.onMarketplaceSale({
      sellerUserId: 9,
      buyerUserId: 1,
      orderId: 42,
      total: 30,
      currency: "USD",
    });
    const body = notificationService.createNotification.mock.calls[0][2];
    expect(body).toContain("$");
  });

  it("handles order.shipped: notif + email for buyer", async () => {
    await listener.onOrderShipped({
      buyerUserId: 1,
      orderId: 42,
      trackingNumber: "TRK123",
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      1,
      "Commande expédiée",
      expect.any(String),
      "order.shipped",
      expect.objectContaining({
        link: "/orders/42",
        trackingNumber: "TRK123",
      }),
      expect.objectContaining({ key: expect.any(String) }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(1);
  });

  it("propagates a failed delivery of an event the dispatcher retries", async () => {
    notificationService.createNotification.mockRejectedValueOnce(
      new Error("boom"),
    );

    await expect(
      listener.onOrderRefundCreated({
        eventId: "outbox-9",
        aggregateType: "order",
        aggregateId: "42",
        orderId: 42,
        buyerUserId: 1,
        refundOperationId: "op-1",
        amount: 10,
        currency: "EUR",
        reason: null,
      }),
    ).rejects.toThrow("boom");
  });

  it("reports a failed direct delivery instead of rejecting into a void", async () => {
    // Nothing retries a directly emitted event, so its failure is logged
    // rather than left as an unhandled rejection.
    notificationService.createNotification.mockRejectedValueOnce(
      new Error("boom"),
    );

    await expect(
      listener.onFollowCreated({
        followerUserId: 1,
        followedUserId: 2,
        followerName: "Alice",
      }),
    ).resolves.toBeUndefined();
  });

  it("claims each marketplace delivery under its own consumer", async () => {
    await listener.onOrderItemClaimCreated({
      eventId: "outbox-1",
      aggregateType: "support_ticket",
      aggregateId: "7",
      ticketId: 7,
      orderId: 42,
      orderItemId: 9,
      claimCategory: "damaged_item",
      buyerId: 1,
      sellerUserId: 2,
    });

    expect(consumers.claims).toEqual(["notification:order.item_claim_created"]);
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      2,
      expect.any(String),
      expect.any(String),
      "order.item_claim_created",
      expect.objectContaining({ orderId: 42, ticketId: 7 }),
      expect.objectContaining({ key: "order.item_claim_created" }),
    );
  });

  it("refuses to deliver an event that carries no recipient", async () => {
    await expect(
      listener.onOrderItemDelivered({
        eventId: "outbox-2",
        aggregateType: "order_item",
        aggregateId: "9",
        orderId: 42,
        orderItemId: 9,
        sellerUserId: null,
        buyerId: 1,
        deliveredAt: new Date(),
      }),
    ).rejects.toThrow("no recipient");
  });
});
