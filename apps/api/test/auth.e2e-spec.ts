import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import type { Server } from "http";
import request from "supertest";
import { AppModule } from "./../src/app.module";
import { createUser, login, uniqueEmail } from "./helpers/auth";

const passThroughGuard = { canActivate: () => true };

jest.setTimeout(60000);

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

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
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("registers a new user and returns tokens", async () => {
      const email = uniqueEmail("register");
      const password = "Password123!";

      const response = await request(httpServer)
        .post("/auth/register")
        .send({
          email,
          password,
          confirmPassword: password,
          firstName: "John",
          lastName: "Doe",
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.tokens.refreshToken).toEqual(expect.any(String));
      expect(response.body.accessTokenExpiresAt).toEqual(expect.any(Number));
    });

    it("sets accessToken and refreshToken cookies on register", async () => {
      const email = uniqueEmail("register-cookie");
      const response = await request(httpServer)
        .post("/auth/register")
        .send({
          email,
          password: "Password123!",
          confirmPassword: "Password123!",
          firstName: "Cookie",
          lastName: "User",
        });

      expect(response.status).toBe(201);
      const cookies = (response.headers["set-cookie"] ?? []) as unknown as string[];
      const cookieNames = cookies.map((c) => c.split("=")[0]);
      expect(cookieNames).toContain("accessToken");
      expect(cookieNames).toContain("refreshToken");
    });

    it("rejects duplicate email with 409", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .post("/auth/register")
        .send({
          email: user.email,
          password: user.password,
          confirmPassword: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
        });

      expect(response.status).toBe(409);
    });
  });

  describe("POST /auth/login", () => {
    it("logs in an existing user and returns tokens", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .post("/auth/login")
        .send({ email: user.email, password: user.password });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.tokens.refreshToken).toEqual(expect.any(String));
    });

    it("rejects invalid password with 401", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .post("/auth/login")
        .send({ email: user.email, password: "WrongPassword123!" });

      expect(response.status).toBe(401);
      expect(response.body.tokens).toBeUndefined();
    });

    it("rejects unknown email with 401", async () => {
      const response = await request(httpServer)
        .post("/auth/login")
        .send({ email: uniqueEmail("ghost"), password: "Password123!" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("issues new tokens when the refresh cookie is valid", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .post("/auth/refresh")
        .set("Cookie", user.cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.tokens.refreshToken).toEqual(expect.any(String));
      // New tokens must differ from the original ones.
      expect(response.body.tokens.refreshToken).not.toBe(user.refreshToken);
    });

    it("rejects refresh without a valid refresh token", async () => {
      const response = await request(httpServer).post("/auth/refresh");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("logs out the current user and clears cookies", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();
      const clearCookies = (response.headers["set-cookie"] ?? []) as unknown as string[];
      // clearCookie sets the cookie to an empty value with an expired date
      const accessCleared = clearCookies.find((c) =>
        c.startsWith("accessToken="),
      );
      const refreshCleared = clearCookies.find((c) =>
        c.startsWith("refreshToken="),
      );
      expect(accessCleared).toBeDefined();
      expect(refreshCleared).toBeDefined();
    });

    it("rejects logout without an access token", async () => {
      const response = await request(httpServer).post("/auth/logout");
      expect(response.status).toBe(401);
    });
  });

  describe("Login uses cookies via /users/me", () => {
    it("authenticates a subsequent request with the access cookie", async () => {
      const user = await createUser(httpServer);

      const response = await request(httpServer)
        .get("/users/me")
        .set("Cookie", user.cookies);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
    });
  });
});
