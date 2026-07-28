import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";
import { createUser, getPlayerId, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("PlayerController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;
  let playerId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    user = await createUser(httpServer, {
      firstName: "Player",
      lastName: "History",
    });
    playerId = await getPlayerId(httpServer, user.accessToken);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("GET /player/:id/tournament-history", () => {
    it("returns tournament history publicly for a valid player", async () => {
      const response = await request(httpServer).get(
        `/player/${playerId}/tournament-history`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("history");
      expect(response.body).toHaveProperty("stats");
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it("returns empty history when player has no tournaments", async () => {
      const response = await request(httpServer).get(
        `/player/${playerId}/tournament-history`,
      );
      expect(response.status).toBe(200);
      expect(response.body.history).toEqual([]);
      expect(response.body.stats.totalTournaments).toBe(0);
    });

    it("accepts optional period query parameter", async () => {
      const response = await request(httpServer).get(
        `/player/${playerId}/tournament-history?period=all`,
      );
      expect(response.status).toBe(200);
      expect(response.body.period).toBe("all");
    });

    it("returns 404 for unknown player id", async () => {
      const response = await request(httpServer).get(
        `/player/9999999/tournament-history`,
      );
      expect(response.status).toBe(404);
    });

    it("is publicly accessible without authentication", async () => {
      const response = await request(httpServer).get(
        `/player/${playerId}/tournament-history`,
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /player/:id", () => {
    it("returns player info for a valid id when authenticated", async () => {
      const response = await request(httpServer)
        .get(`/player/${playerId}`)
        .set("Authorization", `Bearer ${user.accessToken}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(playerId);
    });

    it("rejects unauthenticated access with 401", async () => {
      const response = await request(httpServer).get(`/player/${playerId}`);
      expect(response.status).toBe(401);
    });
  });
});
