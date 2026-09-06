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

const stripeServiceMock = {
  onModuleInit: jest.fn(),
  createPaymentIntent: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  constructEventFromPayload: jest.fn(),
  createRefund: jest
    .fn()
    .mockResolvedValue({ id: "re_e2e_123", status: "succeeded" }),
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

  beforeEach(async () => {
    // un checkout refusé laisse le panier rempli : sans ça l'article fuite sur
    // les tests suivants, dont le checkout échoue alors en "stock insuffisant"
    await request(httpServer).delete("/user-cart/me/clear").set(authAs(buyer));
    const active = await request(httpServer)
      .get("/marketplace/checkout/pending")
      .set(authAs(buyer));
    if (active.body?.orderId) {
      await request(httpServer)
        .post(`/marketplace/orders/${active.body.orderId}/cancel`)
        .set(authAs(buyer));
    }

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
    stripeServiceMock.retrievePaymentIntent.mockImplementation(
      async (id: string) => ({
        id,
        client_secret: "secret_e2e",
        amount: 1000,
        currency: "eur",
        metadata: {},
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

      const checkout = await startCheckout();
      expect(checkout.status).toBe(201);
      expect(checkout.body.orderId).toEqual(expect.any(Number));
      expect(checkout.body.amount).toBe(40);

      const orderId = checkout.body.orderId;

      const afterReservation = await listingRepo.findOneByOrFail({
        id: listingId,
      });
      expect(afterReservation.quantityAvailable).toBe(1);

      const pending = await request(httpServer)
        .get(`/marketplace/orders/${orderId}`)
        .set(authAs(buyer))
        .expect(200);
      expect(pending.body.status).toBe(OrderStatus.PENDING);
      expect(pending.body.shippingAddress).toBe(SHIPPING_ADDRESS);

      const item = pending.body.orderItems[0];
      expect(item.productName).toEqual(expect.any(String));
      expect(item.sellerName).toContain("Seller");
      expect(Number(item.unitPrice)).toBe(20);

      const cart = await request(httpServer)
        .get("/user-cart/me")
        .set(authAs(buyer))
        .expect(200);
      expect(cart.body.cartItems ?? []).toHaveLength(0);

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

      const sales = await request(httpServer)
        .get("/marketplace/sales")
        .set(authAs(seller))
        .expect(200);
      const sale = sales.body.data.find((s: any) => s.order?.id === orderId);
      expect(sale).toBeDefined();
      expect(sale.fulfillmentStatus).toBe(FulfillmentStatus.TO_SHIP);
      expect(sale.order.shippingAddress).toBe(SHIPPING_ADDRESS);

      await request(httpServer)
        .patch(`/marketplace/sales/${sale.id}/fulfillment`)
        .set(authAs(seller))
        .send({
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          carrier: "Colissimo",
          trackingNumber: "6A123456789",
        })
        .expect(200);

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

  describe("checkout idempotency and resumption (MKT-01)", () => {
    it("returns existing pending session without double reserving stock on duplicate attemptKey", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 25,
        quantityAvailable: 5,
      });
      await addToCart(listingId, 2).expect(201);

      const attemptKey = `attempt_${Date.now()}`;
      const checkout1 = await request(httpServer)
        .post("/marketplace/checkout")
        .set(authAs(buyer))
        .send({ shippingAddress: SHIPPING_ADDRESS, attemptKey })
        .expect(201);

      const listingAfterFirst = await listingRepo.findOneByOrFail({
        id: listingId,
      });
      expect(listingAfterFirst.quantityAvailable).toBe(3);

      const checkout2 = await request(httpServer)
        .post("/marketplace/checkout")
        .set(authAs(buyer))
        .send({ shippingAddress: SHIPPING_ADDRESS, attemptKey })
        .expect(201);

      expect(checkout2.body.orderId).toBe(checkout1.body.orderId);
      expect(checkout2.body.clientSecret).toBe(checkout1.body.clientSecret);

      const listingAfterSecond = await listingRepo.findOneByOrFail({
        id: listingId,
      });
      expect(listingAfterSecond.quantityAvailable).toBe(3);

      await request(httpServer)
        .post(`/marketplace/orders/${checkout1.body.orderId}/cancel`)
        .set(authAs(buyer))
        .expect(201);
    });

    it("allows buyer to retrieve active pending checkout session and cancel reservation", async () => {
      const listingId = await seedListingForSeller(app, seller, {
        price: 30,
        quantityAvailable: 3,
      });
      await addToCart(listingId, 1).expect(201);

      const checkout = await request(httpServer)
        .post("/marketplace/checkout")
        .set(authAs(buyer))
        .send({ shippingAddress: SHIPPING_ADDRESS })
        .expect(201);

      const orderId = checkout.body.orderId;

      const pendingRes = await request(httpServer)
        .get("/marketplace/checkout/pending")
        .set(authAs(buyer))
        .expect(200);

      expect(pendingRes.body.orderId).toBe(orderId);
      expect(pendingRes.body.amount).toBe(30);
      expect(pendingRes.body.items).toHaveLength(1);
      expect(pendingRes.body.clientSecret).toBeDefined();

      await request(httpServer)
        .post(`/marketplace/orders/${orderId}/cancel`)
        .set(authAs(buyer))
        .expect(201);

      const listingAfterCancel = await listingRepo.findOneByOrFail({
        id: listingId,
      });
      expect(listingAfterCancel.quantityAvailable).toBe(3);

      const afterCancelRes = await request(httpServer)
        .get("/marketplace/checkout/pending")
        .set(authAs(buyer))
        .expect(200);

      expect(afterCancelRes.body?.orderId).toBeUndefined();
    });
  });

  describe("receipt confirmation, claims, refunds, and returns (MKT-02, MKT-04, MKT-05)", () => {
    it("handles end-to-end receipt confirmation, claim, partial refund, and return disposition", async () => {
      const initialStock = 5;
      const listingId = await seedListingForSeller(app, seller, {
        price: 50,
        quantityAvailable: initialStock,
      });

      await addToCart(listingId, 1).expect(201);
      const checkout = await request(httpServer)
        .post("/marketplace/checkout")
        .set(authAs(buyer))
        .send({ shippingAddress: SHIPPING_ADDRESS })
        .expect(201);

      const orderId = checkout.body.orderId;

      const intentPromise =
        stripeServiceMock.createPaymentIntent.mock.results.at(-1)
          ?.value as Promise<{ id: string }>;
      const { id: paymentIntentId } = await intentPromise;
      stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
        id: paymentIntentId,
        status: "succeeded",
        amount: Math.round(Number(checkout.body.amount) * 100),
        currency: "eur",
        metadata: { orderId: String(orderId), userId: String(buyer.id) },
      });

      // Confirm payment
      await request(httpServer)
        .post(`/marketplace/orders/${orderId}/confirm`)
        .set(authAs(buyer))
        .expect(201);

      // Stock should have decreased by 1
      let listing = await listingRepo.findOneByOrFail({ id: listingId });
      expect(listing.quantityAvailable).toBe(initialStock - 1);

      // Get order to find item id
      const orderRes = await request(httpServer)
        .get(`/marketplace/orders/${orderId}`)
        .set(authAs(buyer))
        .expect(200);

      const itemId = orderRes.body.orderItems[0].id;
      const orderTotal = Number(orderRes.body.totalAmount);

      // Seller ships the item
      await request(httpServer)
        .patch(`/marketplace/sales/${itemId}/fulfillment`)
        .set(authAs(seller))
        .send({
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          carrier: "Chronopost",
          trackingNumber: "EE123456789FR",
        })
        .expect(200);

      // Buyer confirms receipt (MKT-05)
      const confirmReceiptRes = await request(httpServer)
        .post(`/marketplace/orders/${orderId}/items/${itemId}/confirm-receipt`)
        .set(authAs(buyer))
        .expect(201);

      expect(confirmReceiptRes.body.fulfillmentStatus).toBe(
        FulfillmentStatus.DELIVERED,
      );
      expect(confirmReceiptRes.body.deliveredAt).toBeDefined();

      // Buyer opens a claim (MKT-04)
      const claimRes = await request(httpServer)
        .post(`/marketplace/orders/${orderId}/items/${itemId}/claim`)
        .set(authAs(buyer))
        .send({
          claimCategory: "damaged_item",
          subject: "Damaged corner",
          message: "Card has slight whitening on back corner",
        })
        .expect(201);

      expect(claimRes.body.id).toBeDefined();
      expect(claimRes.body.claimCategory).toBe("damaged_item");
      expect(claimRes.body.subject).toBe("Damaged corner");

      // Check refundable balance (MKT-02)
      const balanceRes1 = await request(httpServer)
        .get(`/marketplace/orders/${orderId}/refunds/remaining`)
        .set(authAs(seller))
        .expect(200);

      expect(balanceRes1.body.totalAmount).toBe(orderTotal);
      expect(balanceRes1.body.alreadyRefunded).toBe(0);
      expect(balanceRes1.body.remainingAmount).toBe(orderTotal);

      // Partial refund without restock (MKT-02)
      await request(httpServer)
        .post(`/marketplace/orders/${orderId}/refund`)
        .set(authAs(seller))
        .send({
          reason: "Partial refund agreed for corner whitening",
          lines: [{ orderItemId: itemId, quantity: 1, amount: 15 }],
        })
        .expect(201);

      // Verify stock was NOT modified by refund (decoupling)
      listing = await listingRepo.findOneByOrFail({ id: listingId });
      expect(listing.quantityAvailable).toBe(initialStock - 1);

      // Check balance updated
      const balanceRes2 = await request(httpServer)
        .get(`/marketplace/orders/${orderId}/refunds/remaining`)
        .set(authAs(seller))
        .expect(200);

      expect(balanceRes2.body.alreadyRefunded).toBe(15);
      expect(balanceRes2.body.remainingAmount).toBe(orderTotal - 15);

      // Buyer requests a return (MKT-02)
      const returnRes = await request(httpServer)
        .post(`/marketplace/orders/${orderId}/items/${itemId}/returns`)
        .set(authAs(buyer))
        .send({
          quantity: 1,
          reason: "Returning card as agreed",
        })
        .expect(201);

      const returnId = returnRes.body.id;
      expect(returnId).toBeDefined();
      expect(returnRes.body.status).toBe("requested");

      // Seller inspects and sets disposition to RESTOCK (MKT-02)
      const dispositionRes = await request(httpServer)
        .patch(`/marketplace/returns/${returnId}/disposition`)
        .set(authAs(seller))
        .send({
          disposition: "restock",
          notes: "Inspected and restored to available inventory",
        })
        .expect(200);

      expect(dispositionRes.body.disposition).toBe("restock");
      expect(dispositionRes.body.status).toBe("received");

      // Now stock MUST have incremented back!
      listing = await listingRepo.findOneByOrFail({ id: listingId });
      expect(listing.quantityAvailable).toBe(initialStock);
    });
  });
});
