import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createUser, TestUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("UserCartController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let seller: TestUser;
  let buyer: TestUser;
  let listingId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    seller = await createUser(httpServer, {
      firstName: "Seller",
      lastName: "User",
    });
    buyer = await createUser(httpServer, {
      firstName: "Buyer",
      lastName: "User",
    });
    listingId = await seedListingForSeller(app, seller);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /user-cart/me returns an empty cart for a new user", async () => {
    const response = await request(httpServer)
      .get("/user-cart/me")
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.cartItems ?? []).toEqual([]);
  });

  it("POST /user-cart/items adds a listing to the cart", async () => {
    const response = await request(httpServer)
      .post("/user-cart/items")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ listingId, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.quantity).toBe(2);
    expect(response.body.listing.id).toBe(listingId);
  });

  it("PATCH /user-cart/items/:id updates the cart item quantity", async () => {
    const cartResponse = await request(httpServer)
      .get("/user-cart/me")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    const cartItemId = cartResponse.body.cartItems[0].id;

    const response = await request(httpServer)
      .patch(`/user-cart/items/${cartItemId}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ quantity: 1 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(1);
  });

  it("DELETE /user-cart/items/:id removes the item from the cart", async () => {
    const cartResponse = await request(httpServer)
      .get("/user-cart/me")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    const cartItemId = cartResponse.body.cartItems[0].id;

    await request(httpServer)
      .delete(`/user-cart/items/${cartItemId}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .expect(200);

    const followUp = await request(httpServer)
      .get("/user-cart/me")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(followUp.body.cartItems ?? []).toEqual([]);
  });

  it("rejects adding your own listing to the cart", async () => {
    const response = await request(httpServer)
      .post("/user-cart/items")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ listingId, quantity: 1 });

    expect(response.status).toBe(400);
  });

  it("rejects cart endpoints without authentication", async () => {
    await request(httpServer).get("/user-cart/me").expect(401);
    await request(httpServer)
      .post("/user-cart/items")
      .send({ listingId, quantity: 1 })
      .expect(401);
  });
});
