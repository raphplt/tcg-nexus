import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("UserFollowController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("lets an authenticated user follow and unfollow another user", async () => {
    const follower = await createUser(httpServer, {
      firstName: "Follower",
      lastName: "User",
    });
    const followed = await createUser(httpServer, {
      firstName: "Followed",
      lastName: "User",
    });

    const followResponse = await request(httpServer)
      .post(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`);

    expect(followResponse.status).toBe(201);
    expect(followResponse.body.id).toEqual(expect.any(Number));

    const followersResponse = await request(httpServer).get(
      `/users/${followed.id}/followers`,
    );
    expect(followersResponse.status).toBe(200);
    expect(followersResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: follower.id,
          firstName: "Follower",
          lastName: "User",
        }),
      ]),
    );

    const followingResponse = await request(httpServer).get(
      `/users/${follower.id}/following`,
    );
    expect(followingResponse.status).toBe(200);
    expect(followingResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: followed.id,
          firstName: "Followed",
          lastName: "User",
        }),
      ]),
    );

    await request(httpServer)
      .delete(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`)
      .expect(204);

    const followersAfterUnfollow = await request(httpServer).get(
      `/users/${followed.id}/followers`,
    );
    expect(followersAfterUnfollow.status).toBe(200);
    expect(
      followersAfterUnfollow.body.some((user: { id: number }) => {
        return user.id === follower.id;
      }),
    ).toBe(false);
  });

  it("rejects anonymous follows and self-follows", async () => {
    const user = await createUser(httpServer);

    await request(httpServer).post(`/users/${user.id}/follow`).expect(401);

    await request(httpServer)
      .post(`/users/${user.id}/follow`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(400);
  });
});
