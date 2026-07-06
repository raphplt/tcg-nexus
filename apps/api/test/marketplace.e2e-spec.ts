import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { Currency } from "./../src/common/enums/currency";
import { CardState } from "./../src/common/enums/pokemonCardsType";
import { ProductKind } from "./../src/common/enums/product-kind";
import { StripeService } from "./../src/marketplace/stripe.service";
import { createUser, TestUser } from "./helpers/auth";
import { createE2eApp } from "./helpers/app";
import { ensureCard } from "./helpers/marketplace";

jest.setTimeout(60000);

const stripeServiceMock = {
  onModuleInit: jest.fn(),
  retrievePaymentIntent: jest.fn(),
};

describe("MarketplaceController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let seller: TestUser;
  let other: TestUser;
  let cardId: string;
  let listingId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [
        { provide: StripeService, useValue: stripeServiceMock },
      ],
    }));
    httpServer = app.getHttpServer() as Server;

    seller = await createUser(httpServer, {
      firstName: "Market",
      lastName: "Seller",
    });
    other = await createUser(httpServer, {
      firstName: "Market",
      lastName: "Buyer",
    });
    cardId = (await ensureCard(app)).id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /marketplace/listings", () => {
    it("creates a card listing for an authenticated seller", async () => {
      const response = await request(httpServer)
        .post("/marketplace/listings")
        .set("Authorization", `Bearer ${seller.accessToken}`)
        .send({
          productKind: ProductKind.CARD,
          pokemonCardId: cardId,
          cardState: CardState.NM,
          price: 19.99,
          currency: Currency.EUR,
          quantityAvailable: 3,
          description: "E2E listing",
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toEqual(expect.any(Number));
      expect(Number(response.body.price)).toBe(19.99);
      listingId = response.body.id;
    });

    it("rejects a card listing without cardState", async () => {
      const response = await request(httpServer)
        .post("/marketplace/listings")
        .set("Authorization", `Bearer ${seller.accessToken}`)
        .send({
          productKind: ProductKind.CARD,
          pokemonCardId: cardId,
          price: 5,
          currency: Currency.EUR,
        });

      expect(response.status).toBe(400);
    });

    it("rejects listing creation without authentication", async () => {
      await request(httpServer)
        .post("/marketplace/listings")
        .send({
          productKind: ProductKind.CARD,
          pokemonCardId: cardId,
          cardState: CardState.NM,
          price: 5,
          currency: Currency.EUR,
        })
        .expect(401);
    });
  });

  describe("GET /marketplace/listings", () => {
    it("returns a paginated public list of listings", async () => {
      const response = await request(httpServer)
        .get("/marketplace/listings")
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      const ids = response.body.data.map((l: { id: number }) => l.id);
      expect(ids).toContain(listingId);
    });

    it("returns a listing by id publicly", async () => {
      const response = await request(httpServer).get(
        `/marketplace/listings/${listingId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(listingId);
    });

    it("returns 404 for an unknown listing id", async () => {
      await request(httpServer).get("/marketplace/listings/999999").expect(404);
    });
  });

  describe("GET /marketplace/listings/my-listings", () => {
    it("returns only the seller's listings", async () => {
      const response = await request(httpServer)
        .get("/marketplace/listings/my-listings")
        .set("Authorization", `Bearer ${seller.accessToken}`);

      expect(response.status).toBe(200);
      const ids = response.body.data.map((l: { id: number }) => l.id);
      expect(ids).toContain(listingId);
    });

    it("rejects my-listings without authentication", async () => {
      await request(httpServer)
        .get("/marketplace/listings/my-listings")
        .expect(401);
    });
  });

  describe("PATCH/DELETE /marketplace/listings/:id ownership", () => {
    it("lets the owner update their listing", async () => {
      const response = await request(httpServer)
        .patch(`/marketplace/listings/${listingId}`)
        .set("Authorization", `Bearer ${seller.accessToken}`)
        .send({ price: 25.0 });

      expect(response.status).toBe(200);
      expect(Number(response.body.price)).toBe(25.0);
    });

    it("forbids a non-owner from updating the listing", async () => {
      await request(httpServer)
        .patch(`/marketplace/listings/${listingId}`)
        .set("Authorization", `Bearer ${other.accessToken}`)
        .send({ price: 1 })
        .expect(403);
    });

    it("forbids a non-owner from deleting the listing", async () => {
      await request(httpServer)
        .delete(`/marketplace/listings/${listingId}`)
        .set("Authorization", `Bearer ${other.accessToken}`)
        .expect(403);
    });

    it("lets the owner delete their listing", async () => {
      await request(httpServer)
        .delete(`/marketplace/listings/${listingId}`)
        .set("Authorization", `Bearer ${seller.accessToken}`)
        .expect(200);
    });
  });

  describe("POST /marketplace/orders", () => {
    it("rejects order creation without authentication", async () => {
      await request(httpServer)
        .post("/marketplace/orders")
        .send({ paymentIntentId: "pi_test", shippingAddress: "1 rue test" })
        .expect(401);
    });

    it("rejects order creation when the cart is empty", async () => {
      stripeServiceMock.retrievePaymentIntent.mockResolvedValueOnce({
        status: "succeeded",
        amount: 0,
      });

      const response = await request(httpServer)
        .post("/marketplace/orders")
        .set("Authorization", `Bearer ${other.accessToken}`)
        .send({ paymentIntentId: "pi_test", shippingAddress: "1 rue test" });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /marketplace/sellers/:id public endpoints", () => {
    it("returns seller statistics publicly", async () => {
      const response = await request(httpServer).get(
        `/marketplace/sellers/${seller.id}`,
      );

      expect(response.status).toBe(200);
    });

    it("returns seller listings publicly", async () => {
      const response = await request(httpServer).get(
        `/marketplace/sellers/${seller.id}/listings`,
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
