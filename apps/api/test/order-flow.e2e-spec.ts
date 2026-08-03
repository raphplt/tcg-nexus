import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { FulfillmentStatus } from "./../src/common/enums/fulfillment-status";
import { Listing } from "./../src/marketplace/entities/listing.entity";
import { OrderStatus } from "./../src/marketplace/entities/order.entity";
import { StripeService } from "./../src/marketplace/stripe.service";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

const SHIPPING_ADDRESS = "12 rue des Cartes, 75001 Paris, France";

/**
 * Stripe est simulé, mais le PaymentIntent renvoyé porte les mêmes métadonnées
 * qu'en réel : c'est précisément ce que le serveur revérifie.
 */
const stripeServiceMock = {
  onModuleInit: jest.fn(),
  createPaymentIntent: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  constructEventFromPayload: jest.fn(),
};

describe("Order flow (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let listingRepo: Repository<Listing>;
  let seller: TestUser;
  let buyer: TestUser;

  const authAs = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [
        { provide: StripeService, useValue: stripeServiceMock },
      ],
    }));
    httpServer = app.getHttpServer() as Server;
    listingRepo = app.get<Repository<Listing>>(getRepositoryToken(Listing));

    seller = await createUser(httpServer, {
      firstName: "Flow",
      lastName: "Seller",
    });
    buyer = await createUser(httpServer, {
      firstName: "Flow",
      lastName: "Buyer",
    });
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    let counter = 0;
    stripeServiceMock.createPaymentIntent.mockImplementation(
      async (amount: number, currency: string, metadata: any) => ({
        id: `pi_e2e_${Date.now()}_${counter++}`,
        client_secret: "secret_e2e",
        amount: Math.round(amount * 100),
        currency,
        metadata,
        status: "requires_payment_method",
      }),
    );
  });

  const addToCart = (listingId: number, quantity = 1) =>
    request(httpServer)
      .post("/user-cart/items")
      .set(authAs(buyer))
      .send({ listingId, quantity });

  const startCheckout = () =>
    request(httpServer)
      .post("/marketplace/checkout")
      .set(authAs(buyer))
      .send({ shippingAddress: SHIPPING_ADDRESS });

  describe("full purchase journey", () => {
    it("reserves stock, persists the address, confirms and ships", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 20,
        quantityAvailable: 3,
      });

      await addToCart(listingId, 2).expect(201);

      // 1. Checkout : la commande existe avant tout débit.
      const checkout = await startCheckout();
      expect(checkout.status).toBe(201);
      expect(checkout.body.orderId).toEqual(expect.any(Number));
      expect(checkout.body.amount).toBe(40);

      const orderId = checkout.body.orderId;

      // 2. Le stock est immédiatement réservé.
      const afterReservation = await listingRepo.findOneByOrFail({
        id: listingId,
      });
      expect(afterReservation.quantityAvailable).toBe(1);

      // 3. La commande est en attente et connaît l'adresse de livraison.
      const pending = await request(httpServer)
        .get(`/marketplace/orders/${orderId}`)
        .set(authAs(buyer))
        .expect(200);
      expect(pending.body.status).toBe(OrderStatus.PENDING);
      expect(pending.body.shippingAddress).toBe(SHIPPING_ADDRESS);

      // 4. La ligne porte l'instantané du produit.
      const item = pending.body.orderItems[0];
      expect(item.productName).toEqual(expect.any(String));
      expect(item.sellerName).toContain("Seller");
      expect(Number(item.unitPrice)).toBe(20);

      // 5. Le panier a été vidé.
      const cart = await request(httpServer)
        .get("/user-cart/me")
        .set(authAs(buyer))
        .expect(200);
      expect(cart.body.cartItems ?? []).toHaveLength(0);

      // 6. Confirmation : le serveur relit le paiement chez Stripe.
      const intentId = stripeServiceMock.createPaymentIntent.mock.results[0]
        .value as Promise<{ id: string }>;
      const { id: paymentIntentId } = await intentId;
      stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
        id: paymentIntentId,
        status: "succeeded",
        amount: 4000,
        currency: "eur",
        metadata: { orderId: String(orderId), userId: String(buyer.id) },
      });

      const confirmed = await request(httpServer)
        .post(`/marketplace/orders/${orderId}/confirm`)
        .set(authAs(buyer))
        .expect(201);
      expect(confirmed.body.status).toBe(OrderStatus.PAID);

      // 7. Le vendeur voit la vente à traiter, avec l'adresse.
      const sales = await request(httpServer)
        .get("/marketplace/sales")
        .set(authAs(seller))
        .expect(200);
      const sale = sales.body.data.find((s: any) => s.order?.id === orderId);
      expect(sale).toBeDefined();
      expect(sale.fulfillmentStatus).toBe(FulfillmentStatus.TO_SHIP);
      expect(sale.order.shippingAddress).toBe(SHIPPING_ADDRESS);

      // 8. Le vendeur expédie avec un numéro de suivi.
      await request(httpServer)
        .patch(`/marketplace/sales/${sale.id}/fulfillment`)
        .set(authAs(seller))
        .send({
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          carrier: "Colissimo",
          trackingNumber: "6A123456789",
        })
        .expect(200);

      // 9. L'acheteur suit son colis, la commande est passée à expédiée.
      const shipped = await request(httpServer)
        .get(`/marketplace/orders/${orderId}`)
        .set(authAs(buyer))
        .expect(200);
      expect(shipped.body.status).toBe(OrderStatus.SHIPPED);
      expect(shipped.body.orderItems[0].trackingNumber).toBe("6A123456789");
    });
  });

  describe("payment integrity", () => {
    it("refuses to confirm with an intent whose amount was tampered with", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 15,
        quantityAvailable: 2,
      });
      await addToCart(listingId, 1).expect(201);

      const checkout = await startCheckout();
      const orderId = checkout.body.orderId;

      stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
        status: "succeeded",
        amount: 100, // 1 € au lieu de 15 €
        currency: "eur",
        metadata: { orderId: String(orderId), userId: String(buyer.id) },
      });

      await request(httpServer)
        .post(`/marketplace/orders/${orderId}/confirm`)
        .set(authAs(buyer))
        .expect(400);

      const stillPending = await request(httpServer)
        .get(`/marketplace/orders/${orderId}`)
        .set(authAs(buyer))
        .expect(200);
      expect(stillPending.body.status).toBe(OrderStatus.PENDING);
    });

    it("refuses to confirm a payment that belongs to another order", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 2,
      });
      await addToCart(listingId, 1).expect(201);

      const checkout = await startCheckout();
      const orderId = checkout.body.orderId;

      stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
        status: "succeeded",
        amount: 1000,
        currency: "eur",
        metadata: { orderId: String(orderId + 999), userId: String(buyer.id) },
      });

      await request(httpServer)
        .post(`/marketplace/orders/${orderId}/confirm`)
        .set(authAs(buyer))
        .expect(400);
    });

    it("keeps the order pending when Stripe has not collected the payment", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 2,
      });
      await addToCart(listingId, 1).expect(201);

      const checkout = await startCheckout();

      stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
        status: "requires_payment_method",
      });

      await request(httpServer)
        .post(`/marketplace/orders/${checkout.body.orderId}/confirm`)
        .set(authAs(buyer))
        .expect(400);
    });
  });

  describe("stock safety", () => {
    it("refuses a checkout that exceeds the remaining stock", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 1,
      });

      await addToCart(listingId, 1).expect(201);
      // Le stock disparaît entre la mise au panier et le paiement.
      await listingRepo.update({ id: listingId }, { quantityAvailable: 0 });

      const checkout = await startCheckout();
      expect(checkout.status).toBe(400);
    });

    it("gives the stock back when an order is cancelled", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 4,
      });
      await addToCart(listingId, 2).expect(201);

      const checkout = await startCheckout();
      const admin = await createAdminUser(httpServer, app, {
        firstName: "Flow",
        lastName: "Admin",
      });

      const reserved = await listingRepo.findOneByOrFail({ id: listingId });
      expect(reserved.quantityAvailable).toBe(2);

      await request(httpServer)
        .patch(`/marketplace/admin/orders/${checkout.body.orderId}/status`)
        .set(authAs(admin))
        .send({ status: OrderStatus.CANCELLED })
        .expect(200);

      const restored = await listingRepo.findOneByOrFail({ id: listingId });
      expect(restored.quantityAvailable).toBe(4);
    });
  });

  describe("access control", () => {
    it("prevents a seller from reading the buyer's order", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 2,
      });
      await addToCart(listingId, 1).expect(201);
      const checkout = await startCheckout();

      await request(httpServer)
        .get(`/marketplace/orders/${checkout.body.orderId}`)
        .set(authAs(seller))
        .expect(403);
    });

    it("prevents fulfilling someone else's sale", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 10,
        quantityAvailable: 2,
      });
      await addToCart(listingId, 1).expect(201);
      const checkout = await startCheckout();

      const order = await request(httpServer)
        .get(`/marketplace/orders/${checkout.body.orderId}`)
        .set(authAs(buyer))
        .expect(200);

      await request(httpServer)
        .patch(`/marketplace/sales/${order.body.orderItems[0].id}/fulfillment`)
        .set(authAs(buyer))
        .send({ fulfillmentStatus: FulfillmentStatus.PREPARING })
        .expect(403);
    });
  });
});
