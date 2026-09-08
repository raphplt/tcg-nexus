import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { SealedProduct } from "../src/sealed-product/entities/sealed-product.entity";
import { SealedProductType } from "../src/sealed-product/enums/sealed-product-type.enum";
import {
  SealedEvent,
  SealedEventType,
} from "../src/marketplace/entities/sealed-event.entity";
import { createE2eApp } from "./helpers/app";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

describe("SealedEvents (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let testUser: TestUser;
  let sealedProductRepo: Repository<SealedProduct>;
  let sealedEventRepo: Repository<SealedEvent>;
  let testProductId: string;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    sealedProductRepo = app.get<Repository<SealedProduct>>(
      getRepositoryToken(SealedProduct),
    );
    sealedEventRepo = app.get<Repository<SealedEvent>>(
      getRepositoryToken(SealedEvent),
    );

    testUser = await createUser(httpServer, {
      firstName: "Sealed",
      lastName: "Tester",
    });

    let product = await sealedProductRepo.findOne({ where: {} });
    if (!product) {
      product = await sealedProductRepo.save(
        sealedProductRepo.create({
          id: `test-sealed-${Date.now()}`,
          productType: SealedProductType.ETB,
        }),
      );
    }
    testProductId = product.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe("POST /marketplace/sealed-events", () => {
    it("records a view event anonymously", async () => {
      const sessionId = `test-sess-${Date.now()}`;
      const response = await request(httpServer)
        .post("/marketplace/sealed-events")
        .send({
          sealedProductId: testProductId,
          eventType: SealedEventType.VIEW,
          sessionId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true });

      const recorded = await sealedEventRepo.findOne({
        where: { sessionId },
        relations: ["sealedProduct"],
      });
      expect(recorded).not.toBeNull();
      expect(recorded?.sealedProduct.id).toBe(testProductId);
      expect(recorded?.eventType).toBe(SealedEventType.VIEW);
    });

    it("records an event for an authenticated user with context", async () => {
      const sessionId = `auth-sess-${Date.now()}`;
      const response = await request(httpServer)
        .post("/marketplace/sealed-events")
        .set("Authorization", `Bearer ${testUser.accessToken}`)
        .send({
          sealedProductId: testProductId,
          eventType: SealedEventType.ADD_TO_CART,
          sessionId,
          context: { searchQuery: "charizard", referrer: "search" },
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ success: true });

      const recorded = await sealedEventRepo.findOne({
        where: { sessionId },
        relations: ["user", "sealedProduct"],
      });
      expect(recorded).not.toBeNull();
      expect(recorded?.user?.id).toBe(testUser.id);
      expect(recorded?.eventType).toBe(SealedEventType.ADD_TO_CART);
      expect(recorded?.context?.searchQuery).toBe("charizard");
    });

    it("returns 404 when sealed product does not exist", async () => {
      const response = await request(httpServer)
        .post("/marketplace/sealed-events")
        .send({
          sealedProductId: "non-existent-sealed-product-id-99999",
          eventType: SealedEventType.VIEW,
        });

      expect(response.status).toBe(404);
    });

    it("returns 400 on invalid payload", async () => {
      const response = await request(httpServer)
        .post("/marketplace/sealed-events")
        .send({
          sealedProductId: testProductId,
          eventType: "INVALID_EVENT_TYPE",
        });

      expect(response.status).toBe(400);
    });
  });
});
