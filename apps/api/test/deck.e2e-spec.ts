import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getRepositoryToken } from "@nestjs/typeorm";
import cookieParser from "cookie-parser";
import type { Server } from "http";
import { Repository } from "typeorm";
import request from "supertest";
import { AppModule } from "./../src/app.module";
import { DeckFormat } from "./../src/deck-format/entities/deck-format.entity";
import { createUser, TestUser } from "./helpers/auth";

const passThroughGuard = { canActivate: () => true };

/**
 * The paginated endpoints in this project can return either:
 *   - a raw array (older endpoints)
 *   - `{ data: [...], total }` (PaginationHelper.paginateQueryBuilder)
 *   - `{ items: [...], total }` (the public-by-user endpoint added in this branch)
 * This helper extracts the list portion regardless of shape.
 */
function pickList(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

jest.setTimeout(60000);

describe("DeckController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let creator: TestUser;
  let other: TestUser;
  let formatId: number;
  let publicDeckId: number;

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

    creator = await createUser(httpServer, { firstName: "Deck", lastName: "Creator" });
    other = await createUser(httpServer, { firstName: "Other", lastName: "User" });

    // Ensure at least one DeckFormat exists for create-deck tests.
    const formatRepo = app.get<Repository<DeckFormat>>(
      getRepositoryToken(DeckFormat),
    );
    let format = await formatRepo.findOne({ where: {} });
    if (!format) {
      format = await formatRepo.save(
        formatRepo.create({ type: `E2E-Standard-${Date.now()}` }),
      );
    }
    formatId = format.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /deck", () => {
    it("creates a public deck for an authenticated user", async () => {
      const response = await request(httpServer)
        .post("/deck")
        .set("Authorization", `Bearer ${creator.accessToken}`)
        .send({
          deckName: "E2E Public Deck",
          isPublic: true,
          formatId,
          cards: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toEqual(expect.any(Number));
      expect(response.body.name).toBe("E2E Public Deck");
      expect(response.body.isPublic).toBe(true);
      publicDeckId = response.body.id;
    });

    it("creates a private deck and excludes it from public listings", async () => {
      const response = await request(httpServer)
        .post("/deck")
        .set("Authorization", `Bearer ${creator.accessToken}`)
        .send({
          deckName: "E2E Private Deck",
          isPublic: false,
          formatId,
          cards: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.isPublic).toBe(false);
    });

    it("rejects deck creation without authentication", async () => {
      const response = await request(httpServer)
        .post("/deck")
        .send({
          deckName: "Anonymous Deck",
          isPublic: true,
          formatId,
          cards: [],
        });

      expect(response.status).toBe(401);
    });

    it("returns 404 when formatId does not exist", async () => {
      const response = await request(httpServer)
        .post("/deck")
        .set("Authorization", `Bearer ${creator.accessToken}`)
        .send({
          deckName: "Bad Format Deck",
          isPublic: true,
          formatId: 999999,
          cards: [],
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /deck", () => {
    it("returns a paginated list of decks publicly", async () => {
      const response = await request(httpServer)
        .get("/deck")
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      const items = pickList(response.body);
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe("GET /deck/:id", () => {
    it("returns the public deck created above with cards loaded", async () => {
      const response = await request(httpServer).get(`/deck/${publicDeckId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(publicDeckId);
      expect(response.body.name).toBe("E2E Public Deck");
    });

    it("returns 404 for an unknown deck id", async () => {
      const response = await request(httpServer).get("/deck/999999");
      expect(response.status).toBe(404);
    });
  });

  describe("GET /deck/user/:userId/public", () => {
    it("returns only public decks of the requested user", async () => {
      const response = await request(httpServer).get(
        `/deck/user/${creator.id}/public`,
      );

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual(expect.any(Array));
      expect(response.body.total).toEqual(expect.any(Number));
      for (const deck of response.body.items) {
        expect(deck.isPublic).toBe(true);
      }
      const names = response.body.items.map((d: { name: string }) => d.name);
      expect(names).toContain("E2E Public Deck");
      expect(names).not.toContain("E2E Private Deck");
    });

    it("returns an empty page for a user with no decks", async () => {
      const response = await request(httpServer).get(
        `/deck/user/${other.id}/public`,
      );

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe("GET /deck/me", () => {
    it("returns all decks (public + private) of the logged-in user", async () => {
      const response = await request(httpServer)
        .get("/deck/me")
        .set("Authorization", `Bearer ${creator.accessToken}`);

      expect(response.status).toBe(200);
      const items = pickList(response.body);
      const names = items.map((d: { name: string }) => d.name);
      expect(names).toEqual(
        expect.arrayContaining(["E2E Public Deck", "E2E Private Deck"]),
      );
    });

    it("rejects /deck/me without authentication", async () => {
      const response = await request(httpServer).get("/deck/me");
      expect(response.status).toBe(401);
    });
  });
});
