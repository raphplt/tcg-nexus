import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { CollectionItem } from "../src/collection-item/entities/collection-item.entity";
import { Collection } from "../src/collection/entities/collection.entity";
import { ProductKind } from "../src/common/enums/product-kind";
import { SealedCondition } from "../src/common/enums/sealed-condition";
import { SealedProduct } from "../src/sealed-product/entities/sealed-product.entity";
import { SealedProductLocale } from "../src/sealed-product/entities/sealed-product-locale.entity";
import { SealedProductType } from "../src/sealed-product/enums/sealed-product-type.enum";
import { ensureCard } from "./helpers/marketplace";
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

  // An unvalidated body used to reach findOne({ where: { id: undefined } }),
  // where TypeORM drops the criterion and returns the first card of the table:
  // the endpoint answered 201 and filed a card nobody asked for.
  it("rejects an item write without a card identifier instead of picking one", async () => {
    const owner = await createUser(httpServer);

    const createResponse = await request(httpServer)
      .post("/collection")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: `Items E2E Collection ${Date.now()}`, isPublic: false })
      .expect(201);

    const collectionId = createResponse.body.id;

    for (const route of ["items", "items/remove"]) {
      await request(httpServer)
        .post(`/collection/${collectionId}/${route}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({})
        .expect(400);

      await request(httpServer)
        .post(`/collection/${collectionId}/${route}`)
        .set("Authorization", `Bearer ${owner.accessToken}`)
        .send({ cardId: "not-the-expected-field" })
        .expect(400);
    }

    const itemsResponse = await request(httpServer)
      .get(`/collection/${collectionId}/items`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(itemsResponse.body.data).toEqual([]);
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
  it("loads and searches mixed inventory without allowing a public reader to mutate it", async () => {
    const owner = await createUser(httpServer);
    const outsider = await createUser(httpServer);
    const db = app.get(DataSource);
    const card = await ensureCard(app);
    const collection = await db.getRepository(Collection).save({
      name: "Mixed inventory regression",
      isPublic: true,
      user: { id: owner.id },
    });
    const sealed = await db.getRepository(SealedProduct).save({
      id: `mixed-box-${Date.now()}`,
      productType: SealedProductType.ETB,
      image: "fixtures/box.png",
    });
    await db.getRepository(SealedProductLocale).save({
      sealedProductId: sealed.id,
      locale: "en",
      name: "Mixed Trainer Box",
    });
    const items = await db.getRepository(CollectionItem).save([
      {
        collection,
        productKind: ProductKind.CARD,
        pokemonCard: card,
        quantity: 2,
      },
      {
        collection,
        productKind: ProductKind.SEALED,
        sealedProduct: sealed,
        quantity: 1,
        sealedCondition: SealedCondition.BOX_DAMAGED,
      },
    ]);
    const response = await request(httpServer)
      .get(`/collection/${collection.id}/items`)
      .set("Accept-Language", "en")
      .query({ sortBy: "pokemonCard.name", limit: 10 })
      .expect(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productKind: "sealed",
          sealedProduct: expect.objectContaining({
            id: sealed.id,
            name: "Mixed Trainer Box",
          }),
          sealedCondition: "box_damaged",
        }),
      ]),
    );
    const search = await request(httpServer)
      .get(`/collection/${collection.id}/items`)
      .query({ search: "Trainer Box" })
      .expect(200);
    expect(search.body.meta.totalItems).toBe(1);
    expect(search.body.data[0].sealedProduct.id).toBe(sealed.id);
    await request(httpServer)
      .delete(`/collection/${collection.id}/items/${items[0].id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .expect(403);
    await request(httpServer)
      .post(`/collection-item/collection/${collection.id}/sealed`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ sealedProductId: sealed.id })
      .expect(403);
    await request(httpServer)
      .post(`/collection/${collection.id}/items`)
      .send({ pokemonCardId: card.id })
      .expect(401);
    expect(
      await db
        .getRepository(CollectionItem)
        .countBy({ collection: { id: collection.id } }),
    ).toBe(2);
  });
});
