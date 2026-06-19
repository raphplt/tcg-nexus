import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getRepositoryToken } from "@nestjs/typeorm";
import cookieParser from "cookie-parser";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { AppModule } from "./../src/app.module";
import { Notification } from "./../src/notification/entities/notification.entity";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

const passThroughGuard = { canActivate: () => true };

describe("NotificationController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;
  let notificationRepo: Repository<Notification>;

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

    user = await createUser(httpServer);
    notificationRepo = app.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );

    await notificationRepo.save([
      notificationRepo.create({
        user: { id: user.id } as any,
        title: "N1",
        body: "B1",
        type: "info",
        data: { link: "/x" },
        isRead: false,
      }),
      notificationRepo.create({
        user: { id: user.id } as any,
        title: "N2",
        body: "B2",
        type: "info",
        data: null,
        isRead: true,
      }),
    ]);
  }, 60000);

  afterAll(async () => {
    await notificationRepo.delete({ user: { id: user.id } });
    await app.close();
  });

  it("POST /notifications/register-device registers a device token", async () => {
    const response = await request(httpServer)
      .post("/notifications/register-device")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ token: "ExponentPushToken[abc]", platform: "expo" });
    expect(response.status).toBe(201);
    expect(response.body.token).toBe("ExponentPushToken[abc]");
  });

  it("GET /notifications returns all by default", async () => {
    const response = await request(httpServer)
      .get("/notifications")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it("GET /notifications?filter=unread returns only unread", async () => {
    const response = await request(httpServer)
      .get("/notifications?filter=unread")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.every((n: any) => n.isRead === false)).toBe(true);
  });

  it("GET /notifications?filter=read returns only read", async () => {
    const response = await request(httpServer)
      .get("/notifications?filter=read")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.every((n: any) => n.isRead === true)).toBe(true);
  });

  it("PATCH /notifications/read-all marks all as read", async () => {
    const response = await request(httpServer)
      .patch("/notifications/read-all")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const followUp = await request(httpServer)
      .get("/notifications?filter=unread")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(followUp.body.data.length).toBe(0);
  });

  it("rejects access without auth", async () => {
    const response = await request(httpServer).get("/notifications");
    expect(response.status).toBe(401);
  });
});
