import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { ArticleStatus } from "../src/article/entities/article.entity";
import { createE2eApp } from "./helpers/app";
import { authHeader, createAdminUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("ArticleController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let adminUser: TestUser;
  let createdArticleId: number;
  const testSlug = `e2e-article-${Date.now()}`;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    adminUser = await createAdminUser(httpServer, app);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /articles returns a list of published articles", async () => {
    const response = await request(httpServer).get("/articles");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("POST /articles returns 401 when unauthenticated", async () => {
    const response = await request(httpServer).post("/articles").send({
      title: "Unauthorized Article",
      slug: "unauthorized-article",
    });

    expect(response.status).toBe(401);
  });

  it("POST /articles creates an article when authenticated as admin", async () => {
    const response = await request(httpServer)
      .post("/articles")
      .set("Authorization", authHeader(adminUser.accessToken))
      .send({
        title: "E2E Test Tournament Guide",
        slug: testSlug,
        content: "Detailed tournament strategy and mechanics.",
        excerpt: "Learn how to compete in official tournaments.",
        status: ArticleStatus.PUBLISHED,
        locale: "en",
        publishedAt: new Date().toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.slug).toBe(testSlug);
    expect(response.body.title).toBe("E2E Test Tournament Guide");
    createdArticleId = response.body.id;
  });

  it("GET /articles/slug/:slug finds a published article by slug", async () => {
    const response = await request(httpServer).get(
      `/articles/slug/${testSlug}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdArticleId);
    expect(response.body.slug).toBe(testSlug);
  });

  it("GET /articles/slug/:slug returns 404 for unknown slug", async () => {
    const response = await request(httpServer).get(
      "/articles/slug/completely-unknown-slug-xyz",
    );

    expect(response.status).toBe(404);
  });

  it("GET /articles/:id finds published article by numeric id", async () => {
    const response = await request(httpServer).get(
      `/articles/${createdArticleId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdArticleId);
  });

  it("GET /articles/:id returns 404 for non-existent id", async () => {
    const response = await request(httpServer).get("/articles/9999999");
    expect(response.status).toBe(404);
  });

  it("GET /articles/admin returns articles for admin users", async () => {
    const response = await request(httpServer)
      .get("/articles/admin")
      .set("Authorization", authHeader(adminUser.accessToken));

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("PATCH /articles/:id updates article fields", async () => {
    const response = await request(httpServer)
      .patch(`/articles/${createdArticleId}`)
      .set("Authorization", authHeader(adminUser.accessToken))
      .send({
        title: "Updated Tournament Guide",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Updated Tournament Guide");
  });

  it("DELETE /articles/:id removes the article", async () => {
    const response = await request(httpServer)
      .delete(`/articles/${createdArticleId}`)
      .set("Authorization", authHeader(adminUser.accessToken));

    expect(response.status).toBe(200);

    const check = await request(httpServer).get(
      `/articles/${createdArticleId}`,
    );
    expect(check.status).toBe(404);
  });
});
