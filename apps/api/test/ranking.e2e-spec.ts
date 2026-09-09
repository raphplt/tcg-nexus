import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("RankingController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let testUser: TestUser;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    testUser = await createUser(httpServer, {
      firstName: "Ranked",
      lastName: "Player",
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("GET /ranking/global", () => {
    it("returns global rankings with pagination structure", async () => {
      const response = await request(httpServer)
        .get("/ranking/global")
        .query({ page: 1, limit: 10, period: "all-time" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it("supports filtering by different time periods", async () => {
      const weeklyResponse = await request(httpServer)
        .get("/ranking/global")
        .query({ page: 1, limit: 5, period: "week" });
      expect(weeklyResponse.status).toBe(200);

      const monthlyResponse = await request(httpServer)
        .get("/ranking/global")
        .query({ page: 1, limit: 5, period: "month" });
      expect(monthlyResponse.status).toBe(200);
    });
  });

  describe("GET /ranking/me", () => {
    it("rejects unauthenticated requests with 401", async () => {
      await request(httpServer).get("/ranking/me").expect(401);
    });

    it("returns ranking position for authenticated user", async () => {
      const response = await request(httpServer)
        .get("/ranking/me")
        .set("Authorization", `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rank");
      expect(response.body).toHaveProperty("score");
      expect(response.body).toHaveProperty("userId");
      expect(response.body.userId).toBe(testUser.id);
    });
  });

  describe("GET /ranking/elo/me", () => {
    it("rejects unauthenticated requests with 401", async () => {
      await request(httpServer).get("/ranking/elo/me").expect(401);
    });

    it("returns Elo rating and recent history for authenticated user", async () => {
      const response = await request(httpServer)
        .get("/ranking/elo/me")
        .set("Authorization", `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("elo");
      expect(response.body).toHaveProperty("history");
      expect(typeof response.body.elo).toBe("number");
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe("GET /ranking", () => {
    it("returns tournament rankings list", async () => {
      const response = await request(httpServer).get("/ranking");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
