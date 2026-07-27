import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getRepositoryToken } from "@nestjs/typeorm";
import cookieParser from "cookie-parser";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { AppModule } from "./../src/app.module";
import {
  Badge,
  BadgeCategory,
} from "./../src/badge/entities/badge.entity";
import { UserBadge } from "./../src/badge/entities/user-badge.entity";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

const passThroughGuard = { canActivate: () => true };

describe("BadgeController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;
  let userBadgeRepo: Repository<UserBadge>;
  let badgeRepo: Repository<Badge>;
  let seededBadge: Badge;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(passThroughGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    httpServer = app.getHttpServer() as Server;

    user = await createUser(httpServer, {
      firstName: "Badge",
      lastName: "Test",
    });

    badgeRepo = app.get<Repository<Badge>>(getRepositoryToken(Badge));
    userBadgeRepo = app.get<Repository<UserBadge>>(
      getRepositoryToken(UserBadge),
    );

    seededBadge =
      (await badgeRepo.findOne({ where: {} })) ??
      (await badgeRepo.save(
        badgeRepo.create({
          code: `e2e_badge_${Date.now()}`,
          name: "E2E Test Badge",
          description: "For e2e tests",
          icon: "sparkles",
          category: BadgeCategory.COLLECTION,
          threshold: 1,
        }),
      ));
  }, 60000);

  afterAll(async () => {
    await userBadgeRepo.delete({ user: { id: user.id } });
    await app.close();
  });

  it("returns an empty array for a user with no badges (public)", async () => {
    const response = await request(httpServer).get(`/badges/user/${user.id}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it("returns badges with the badge relation joined", async () => {
    await userBadgeRepo.save(
      userBadgeRepo.create({
        user: { id: user.id } as any,
        badge: seededBadge,
      }),
    );

    const response = await request(httpServer).get(`/badges/user/${user.id}`);
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].badge).toBeDefined();
    expect(response.body[0].badge.code).toBe(seededBadge.code);
    expect(response.body[0].badge.name).toBe(seededBadge.name);
  });

  it("is publicly accessible without authentication", async () => {
    const response = await request(httpServer).get(`/badges/user/${user.id}`);
    expect(response.status).toBe(200);
  });

  it("returns an empty array for a user id that does not exist", async () => {
    const response = await request(httpServer).get(
      `/badges/user/9999999`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
