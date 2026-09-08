import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";
import { ensureCard } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("CardController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let testCardId: string;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    const card = await ensureCard(app);
    testCardId = card.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /cards returns a list of cards", async () => {
    const response = await request(httpServer).get("/cards");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("GET /cards/paginated returns paginated card results with metadata", async () => {
    const response = await request(httpServer)
      .get("/cards/paginated")
      .query({ page: 1, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.currentPage).toBe(1);
    expect(response.body.meta.itemsPerPage).toBe(5);
  });

  it("GET /cards/random returns a single random card", async () => {
    const response = await request(httpServer).get("/cards/random");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("name");
  });

  it("GET /cards/:id returns the requested card details", async () => {
    const response = await request(httpServer).get(`/cards/${testCardId}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testCardId);
  });

  it("GET /cards/:id returns 404 for non-existent card ID", async () => {
    const response = await request(httpServer).get(
      "/cards/00000000-0000-0000-0000-000000000000",
    );
    expect(response.status).toBe(404);
  });
});
