import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("CollectionController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("creates, reads, updates, lists, and deletes the current user's collection", async () => {
    const owner = await createUser(httpServer);
    const collectionName = `E2E Collection ${Date.now()}`;

    const createResponse = await request(httpServer)
      .post("/collection")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: collectionName,
        description: "Created by an e2e test",
        isPublic: true,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toEqual(expect.any(Number));
    expect(createResponse.body.name).toBe(collectionName);
    expect(createResponse.body.isPublic).toBe(true);
    const collectionId = createResponse.body.id;

    const publicResponse = await request(httpServer).get(
      `/collection/${collectionId}`,
    );
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.id).toBe(collectionId);

    const myCollectionsResponse = await request(httpServer)
      .get("/collection/my/collections")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(myCollectionsResponse.status).toBe(200);
    expect(myCollectionsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: collectionId,
          name: collectionName,
        }),
      ]),
    );

    const updateResponse = await request(httpServer)
      .put(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: `${collectionName} updated`,
        description: "Updated by an e2e test",
        isPublic: false,
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe(`${collectionName} updated`);
    expect(updateResponse.body.isPublic).toBe(false);

    // Once private, the collection must disappear for anonymous callers.
    await request(httpServer)
      .get(`/collection/${collectionId}/items`)
      .query({ page: 1, limit: 5 })
      .expect(404);

    await request(httpServer).get(`/collection/${collectionId}`).expect(404);

    // The owner still reads their own private collection.
    const itemsResponse = await request(httpServer)
      .get(`/collection/${collectionId}/items`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ page: 1, limit: 5 });
    expect(itemsResponse.status).toBe(200);
    expect(itemsResponse.body.data).toEqual([]);
    expect(itemsResponse.body.meta).toEqual(
      expect.objectContaining({
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 5,
        currentPage: 1,
      }),
    );

    await request(httpServer)
      .delete(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(200);

    await request(httpServer).get(`/collection/${collectionId}`).expect(404);
  });

  it("enforces ownership for collection mutations", async () => {
    const owner = await createUser(httpServer);
    const other = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/collection")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: `Private E2E Collection ${Date.now()}`,
        isPublic: false,
      })
      .expect(201);

    const collectionId = createResponse.body.id;

    await request(httpServer)
      .put(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ name: "Stolen collection" })
      .expect(403);

    await request(httpServer)
      .delete(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .expect(403);
  });

  it("hides a private collection from anonymous and third-party readers", async () => {
    const owner = await createUser(httpServer);
    const other = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/collection")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: `Hidden E2E Collection ${Date.now()}`,
        isPublic: false,
      })
      .expect(201);

    const collectionId = createResponse.body.id;

    await request(httpServer).get(`/collection/${collectionId}`).expect(404);

    await request(httpServer)
      .get(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .expect(404);

    await request(httpServer)
      .get(`/collection/${collectionId}/items`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .expect(404);

    const ownerListing = await request(httpServer)
      .get(`/collection/user/${owner.id}`)
      .expect(200);
    expect(
      (ownerListing.body as { id: number }[]).some(
        (collection) => collection.id === collectionId,
      ),
    ).toBe(false);

    await request(httpServer)
      .get(`/collection/${collectionId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(200);
  });

  it("rejects collection creation without authentication", async () => {
    await request(httpServer)
      .post("/collection")
      .send({ name: "Anonymous collection" })
      .expect(401);
  });

  it("rejects anonymous writes into someone else's collection", async () => {
    const owner = await createUser(httpServer);
    const other = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/collection")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: `Target Collection ${Date.now()}`, isPublic: true })
      .expect(201);

    const collectionId = createResponse.body.id;

    await request(httpServer)
      .post(`/collection-item/collection/${collectionId}`)
      .send({ pokemonCardId: "any-card" })
      .expect(401);

    await request(httpServer)
      .post(`/collection-item/collection/${collectionId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ pokemonCardId: "any-card" })
      .expect(403);

    await request(httpServer)
      .post(`/collection-item/wishlist/${owner.id}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ pokemonCardId: "any-card" })
      .expect(403);
  });
});
