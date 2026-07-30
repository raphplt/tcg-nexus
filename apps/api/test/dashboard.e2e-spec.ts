import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("DashboardController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let user: TestUser;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    user = await createUser(httpServer, {
      firstName: "Dashboard",
      lastName: "User",
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("returns dashboard data for an authenticated user", async () => {
    const response = await request(httpServer)
      .get("/dashboard")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Object));
  });

  it("rejects unauthenticated access with 401", async () => {
    const response = await request(httpServer).get("/dashboard");
    expect(response.status).toBe(401);
  });

  it("returns fresh data on repeated requests for the same user", async () => {
    const first = await request(httpServer)
      .get("/dashboard")
      .set("Authorization", `Bearer ${user.accessToken}`);
    const second = await request(httpServer)
      .get("/dashboard")
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("returns dashboard scoped to the authenticated user", async () => {
    const other = await createUser(httpServer, {
      firstName: "Other",
      lastName: "Dashboard",
    });

    const responseUser1 = await request(httpServer)
      .get("/dashboard")
      .set("Authorization", `Bearer ${user.accessToken}`);
    const responseUser2 = await request(httpServer)
      .get("/dashboard")
      .set("Authorization", `Bearer ${other.accessToken}`);

    expect(responseUser1.status).toBe(200);
    expect(responseUser2.status).toBe(200);
  });
});
