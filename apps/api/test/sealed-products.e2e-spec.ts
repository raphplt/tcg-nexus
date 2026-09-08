import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { SealedProduct } from "../src/sealed-product/entities/sealed-product.entity";
import { SealedProductType } from "../src/sealed-product/enums/sealed-product-type.enum";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("SealedProductController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let testProductId: string;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    const sealedProductRepo = app.get<Repository<SealedProduct>>(
      getRepositoryToken(SealedProduct),
    );

    let product = await sealedProductRepo.findOne({ where: {} });
    if (!product) {
      product = await sealedProductRepo.save(
        sealedProductRepo.create({
          id: `test-e2e-sealed-${Date.now()}`,
          productType: SealedProductType.ETB,
        }),
      );
    }
    testProductId = product.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("GET /sealed-products returns an array of sealed products", async () => {
    const response = await request(httpServer).get("/sealed-products");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("GET /sealed-products/paginated returns paginated sealed products", async () => {
    const response = await request(httpServer)
      .get("/sealed-products/paginated")
      .query({ page: 1, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta.currentPage).toBe(1);
    expect(response.body.meta.itemsPerPage).toBe(5);
  });

  it("GET /sealed-products/recent returns recent products limited by query param", async () => {
    const response = await request(httpServer)
      .get("/sealed-products/recent")
      .query({ limit: 4 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(4);
  });

  it("GET /sealed-products/popular returns popular products list", async () => {
    const response = await request(httpServer)
      .get("/sealed-products/popular")
      .query({ limit: 5 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("GET /sealed-products/:id returns the requested product details", async () => {
    const response = await request(httpServer).get(
      `/sealed-products/${testProductId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testProductId);
    expect(response.body).toHaveProperty("productType");
  });

  it("GET /sealed-products/:id returns 404 for non-existent product", async () => {
    const response = await request(httpServer).get(
      "/sealed-products/non-existent-product-id-12345",
    );

    expect(response.status).toBe(404);
  });

  it("GET /sealed-products/:id/stats returns market aggregate statistics", async () => {
    const response = await request(httpServer).get(
      `/sealed-products/${testProductId}/stats`,
    );

    expect(response.status).toBe(200);
    expect(response.body.sealedProductId).toBe(testProductId);
    expect(response.body).toHaveProperty("totalListings");
    expect(response.body).toHaveProperty("totalStock");
    expect(response.body).toHaveProperty("priceHistory");
    expect(Array.isArray(response.body.priceHistory)).toBe(true);
  });

  it("GET /sealed-products/:id/stats returns 404 for non-existent product", async () => {
    const response = await request(httpServer).get(
      "/sealed-products/non-existent-product-id-12345/stats",
    );

    expect(response.status).toBe(404);
  });
});
