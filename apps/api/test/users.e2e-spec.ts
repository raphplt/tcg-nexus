import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { Currency } from "./../src/common/enums/currency";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("UserController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    user = await createUser(httpServer, {
      firstName: "Regular",
      lastName: "User",
    });
    admin = await createAdminUser(httpServer, app, {
      firstName: "Super",
      lastName: "Admin",
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("GET /users/me", () => {
    it("returns the authenticated user's profile", async () => {
      const response = await request(httpServer)
        .get("/users/me")
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe(user.email);
      expect(response.body.password).toBeUndefined();
      expect(response.body.player).toBeDefined();
    });

    it("rejects /users/me without authentication", async () => {
      await request(httpServer).get("/users/me").expect(401);
    });
  });

  describe("PATCH /users/me", () => {
    it("updates the authenticated user's own profile", async () => {
      const response = await request(httpServer)
        .patch("/users/me")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ firstName: "Renamed", preferredCurrency: Currency.USD });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe("Renamed");
      expect(response.body.preferredCurrency).toBe(Currency.USD);
    });
  });

  describe("GET /users/:id/public", () => {
    it("returns a public profile without authentication", async () => {
      const response = await request(httpServer).get(
        `/users/${user.id}/public`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.password).toBeUndefined();
      expect(response.body.followersCount).toEqual(expect.any(Number));
    });
  });

  describe("admin-only routes", () => {
    it("forbids a regular user from listing all users", async () => {
      await request(httpServer)
        .get("/users")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .expect(403);
    });

    it("allows an admin to list all users", async () => {
      const response = await request(httpServer)
        .get("/users")
        .set("Authorization", `Bearer ${admin.accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("forbids a regular user from fetching another user by id", async () => {
      await request(httpServer)
        .get(`/users/${admin.id}`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .expect(403);
    });
  });
});
