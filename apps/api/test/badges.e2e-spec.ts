import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { BadgeService } from "../src/badge/badge.service";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("BadgeController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let testUser: TestUser;
  let badgeService: BadgeService;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    badgeService = app.get<BadgeService>(BadgeService);

    testUser = await createUser(httpServer, {
      firstName: "Badge",
      lastName: "Collector",
    });
  }, 60000);

  afterAll(async () => {
    // Allow asynchronous event listeners (e.g. badge.unlocked notification) to settle
    await new Promise((resolve) => setTimeout(resolve, 300));
    await app.close();
  });

  it("GET /badges/user/:userId returns empty array for new user", async () => {
    const response = await request(httpServer).get(
      `/badges/user/${testUser.id}`,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it("GET /badges/user/:userId returns unlocked badges after stats threshold is reached", async () => {
    await badgeService.checkAndAwardBadges(testUser.id, {
      totalCards: 1,
      totalDecks: 0,
      totalWins: 0,
      totalListings: 0,
      totalPurchases: 0,
    });

    const response = await request(httpServer).get(
      `/badges/user/${testUser.id}`,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);

    const userBadge = response.body[0];
    expect(userBadge).toHaveProperty("badge");
    expect(userBadge.badge.code).toBe("first_card");
    expect(userBadge.badge.name).toBe("Première carte");
    expect(userBadge.badge.category).toBe("collection");
  });

  it("GET /badges/user/:userId awards multiple badges as user progresses", async () => {
    await badgeService.checkAndAwardBadges(testUser.id, {
      totalCards: 12,
      totalDecks: 2,
      totalWins: 1,
      totalListings: 1,
      totalPurchases: 0,
    });

    const response = await request(httpServer).get(
      `/badges/user/${testUser.id}`,
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Should have: first_card, collector_10, first_deck, first_tournament (since totalWins > 0), winner_1, first_listing
    expect(response.body.length).toBeGreaterThanOrEqual(4);

    const codes = response.body.map((ub: any) => ub.badge.code);
    expect(codes).toContain("first_card");
    expect(codes).toContain("collector_10");
    expect(codes).toContain("first_deck");
    expect(codes).toContain("first_listing");
  });
});
