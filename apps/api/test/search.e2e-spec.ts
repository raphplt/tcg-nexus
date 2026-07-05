import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("SearchController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /search returns an empty result for short queries", async () => {
    const response = await request(httpServer).get("/search").query({ query: "a" });

    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([]);
    expect(response.body.total).toBe(0);
    expect(response.body.query).toBe("a");
    expect(response.body.searchTime).toEqual(expect.any(Number));
  });

  it("GET /search accepts a valid query without authentication", async () => {
    const response = await request(httpServer)
      .get("/search")
      .query({ query: "pikachu", limit: 5, page: 1 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(5);
    expect(response.body.query).toBe("pikachu");
  });

  it("GET /search/suggestions returns suggestions for a query", async () => {
    const response = await request(httpServer)
      .get("/search/suggestions")
      .query({ q: "pika", limit: 5 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("GET /search/suggestions/preview returns structured preview data", async () => {
    const response = await request(httpServer)
      .get("/search/suggestions/preview")
      .query({ q: "char", limit: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        suggestions: expect.any(Array),
      }),
    );
  });

  it("GET /search/suggestions/detail returns detailed suggestions", async () => {
    const response = await request(httpServer)
      .get("/search/suggestions/detail")
      .query({ q: "char", limit: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        suggestions: expect.any(Array),
      }),
    );
  });
});
