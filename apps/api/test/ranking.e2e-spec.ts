import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("RankingController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    user = await createUser(httpServer, {
      firstName: "Rank",
      lastName: "User",
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("GET /ranking/global", () => {
    it("returns paginated global ranking when authenticated", async () => {
      const response = await request(httpServer)
        .get("/ranking/global")
        .query({ page: 1, limit: 10 })
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("total");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("accepts period query", async () => {
      const response = await request(httpServer)
        .get("/ranking/global")
        .query({ period: "all-time" })
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
    });

    it("rejects unauthenticated access with 401", async () => {
      const response = await request(httpServer).get("/ranking/global");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /ranking/me", () => {
    it("returns the current user ranking when authenticated", async () => {
      const response = await request(httpServer)
        .get("/ranking/me")
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
    });

    it("rejects unauthenticated access with 401", async () => {
      const response = await request(httpServer).get("/ranking/me");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /ranking/elo/me", () => {
    it("returns elo + history for authenticated user", async () => {
      const response = await request(httpServer)
        .get("/ranking/elo/me")
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("elo");
      expect(response.body).toHaveProperty("history");
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it("returns empty history for a new user", async () => {
      const response = await request(httpServer)
        .get("/ranking/elo/me")
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.history).toEqual([]);
    });

    it("rejects unauthenticated access with 401", async () => {
      const response = await request(httpServer).get("/ranking/elo/me");
      expect(response.status).toBe(401);
    });
  });
});
