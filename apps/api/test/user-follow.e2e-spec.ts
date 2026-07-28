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

  it("returns 404 when following a non-existent user", async () => {
    const user = await createUser(httpServer);

    await request(httpServer)
      .post(`/users/9999999/follow`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(404);
  });

  it("is idempotent: following the same user twice does not create duplicates", async () => {
    const follower = await createUser(httpServer);
    const followed = await createUser(httpServer);

    await request(httpServer)
      .post(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`)
      .expect(201);

    await request(httpServer)
      .post(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`)
      .expect(201);

    const followers = await request(httpServer).get(
      `/users/${followed.id}/followers`,
    );
    const matches = followers.body.filter(
      (u: { id: number }) => u.id === follower.id,
    );
    expect(matches.length).toBe(1);
  });

  it("returns empty followers list for a user nobody follows", async () => {
    const lonely = await createUser(httpServer, {
      firstName: "Lonely",
      lastName: "User",
    });

    const response = await request(httpServer).get(
      `/users/${lonely.id}/followers`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns empty following list for a user who follows nobody", async () => {
    const solo = await createUser(httpServer, {
      firstName: "Solo",
      lastName: "User",
    });

    const response = await request(httpServer).get(
      `/users/${solo.id}/following`,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("exposes followers/following counts on the public profile endpoint", async () => {
    const follower = await createUser(httpServer);
    const followed = await createUser(httpServer);

    await request(httpServer)
      .post(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`)
      .expect(201);

    const profileResponse = await request(httpServer).get(
      `/users/${followed.id}/public`,
    );
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.followersCount).toBeGreaterThanOrEqual(1);
  });

  it("includes isFollowing=true on public profile when requester follows target", async () => {
    const follower = await createUser(httpServer);
    const followed = await createUser(httpServer);

    await request(httpServer)
      .post(`/users/${followed.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`)
      .expect(201);

    const profileResponse = await request(httpServer)
      .get(`/users/${followed.id}/public`)
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.isFollowing).toBe(true);
  });
});
