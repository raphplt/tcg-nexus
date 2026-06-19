import { Test, TestingModule } from "@nestjs/testing";
import { EmailNotificationService } from "./email-notification.service";
import { NotificationListener } from "./notification-listener";
import { NotificationService } from "./notification.service";
import { UserService } from "../user/user.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("NotificationListener", () => {
  let listener: NotificationListener;
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: NotificationService, useValue: notificationService },
        { provide: EmailNotificationService, useValue: emailService },
        { provide: UserService, useValue: userService },
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
    );
    expect(emailService.sendCritical).not.toHaveBeenCalled();
  });

  it("handles marketplace.sale: notif + email for seller", async () => {
    await listener.onMarketplaceSale({
      sellerUserId: 9,
      buyerUserId: 1,
      orderId: 42,
      total: 12.5,
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      9,
      "Vente réalisée",
      expect.any(String),
      "marketplace.sale",
      expect.objectContaining({ link: "/marketplace/orders/42", orderId: 42 }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(1);
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
        link: "/marketplace/orders/42",
        trackingNumber: "TRK123",
      }),
    );
    expect(emailService.sendCritical).toHaveBeenCalledTimes(1);
  });

  it("swallows createNotification errors", async () => {
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
});
