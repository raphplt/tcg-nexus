import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { FulfillmentStatus } from "../src/common/enums/fulfillment-status";
import {
  PayoutStatus,
  SellerAllocationStatus,
} from "../src/common/enums/seller-settlement";
import { Listing } from "../src/marketplace/entities/listing.entity";
import { OrderStatus } from "../src/marketplace/entities/order.entity";
import { StripeService } from "../src/marketplace/stripe.service";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

const SHIPPING_ADDRESS = "15 boulevard Haussmann, 75009 Paris, France";

const stripeServiceMock = {
  onModuleInit: jest.fn(),
  createPaymentIntent: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  constructEventFromPayload: jest.fn(),
  createRefund: jest.fn().mockResolvedValue({ id: "re_e2e_settle", status: "succeeded" }),
};

describe("Settlement, Receipt Import & User Journey (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let listingRepo: Repository<Listing>;
  let seller: TestUser;
  let buyer: TestUser;
  let admin: TestUser;

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
      firstName: "Settlement",
      lastName: "Seller",
    });
    buyer = await createUser(httpServer, {
      firstName: "Settlement",
      lastName: "Buyer",
    });
    admin = await createAdminUser(httpServer, app);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
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
    stripeServiceMock.createPaymentIntent.mockImplementation(
      async (amount: number, currency: string, metadata: any) => ({
        id: `pi_settle_${Date.now()}`,
        client_secret: "secret_settle",
        amount: Math.round(amount * 100),
        currency,
        metadata,
        status: "requires_payment_method",
      }),
    );
  });

  it("executes complete lifecycle: purchase -> allocation -> delivery -> receipt import -> review -> payout -> journey actions", async () => {
    // 1. Create a listing with photo evidence and defect disclosures (MKT-03)
    const listingId = await seedListingForSeller(app, seller, {
      price: 50,
      quantityAvailable: 2,
      photoUrls: ["https://example.com/cards/charizard-front.jpg"],
      defects: ["Corner whitening", "Surface hairline"],
      defectDescription: "Minor whitening visible under bright lamp.",
    });

    // Verify listing exposes photos and defects
    const listingCheck = await request(httpServer)
      .get(`/marketplace/listings/${listingId}`)
      .expect(200);
    expect(listingCheck.body.photoUrls).toContain("https://example.com/cards/charizard-front.jpg");
    expect(listingCheck.body.defects).toContain("Corner whitening");

    // 2. Buyer purchase via cart & checkout
    await request(httpServer)
      .post("/user-cart/items")
      .set(authAs(buyer))
      .send({ listingId, quantity: 1 })
      .expect(201);

    const checkoutRes = await request(httpServer)
      .post("/marketplace/checkout")
      .set(authAs(buyer))
      .send({ shippingAddress: SHIPPING_ADDRESS })
      .expect(201);

    const orderId = checkoutRes.body.orderId;
    expect(orderId).toBeDefined();

    // Mock Stripe payment success and confirm order
    const intentId = stripeServiceMock.createPaymentIntent.mock.results[0]
      .value as Promise<{ id: string }>;
    const { id: paymentIntentId } = await intentId;
    stripeServiceMock.retrievePaymentIntent.mockResolvedValue({
      id: paymentIntentId,
      status: "succeeded",
      amount: 5000,
      currency: "eur",
      metadata: { orderId: String(orderId), userId: String(buyer.id) },
    });

    const confirmed = await request(httpServer)
      .post(`/marketplace/orders/${orderId}/confirm`)
      .set(authAs(buyer))
      .expect(201);
    expect(confirmed.body.status).toBe(OrderStatus.PAID);

    // Verify photo evidence and defect snapshots on order item
    const orderDetails = await request(httpServer)
      .get(`/marketplace/orders/${orderId}`)
      .set(authAs(buyer))
      .expect(200);
    const orderItem = orderDetails.body.orderItems[0];
    expect(orderItem.listingPhotoUrls).toContain("https://example.com/cards/charizard-front.jpg");
    expect(orderItem.listingDefects).toContain("Corner whitening");

    // 3. Verify Seller Allocation and Pending Balance (MKT-06)
    // 50 EUR gross - 5% commission (2.50) = 47.50 net
    const sellerSummaryBeforeDelivery = await request(httpServer)
      .get("/marketplace/seller/settlement/summary")
      .set(authAs(seller))
      .expect(200);

    expect(Number(sellerSummaryBeforeDelivery.body.balancePending)).toBe(47.5);
    expect(Number(sellerSummaryBeforeDelivery.body.balanceAvailable)).toBe(0);

    const allocationsRes = await request(httpServer)
      .get("/marketplace/seller/settlement/allocations")
      .set(authAs(seller))
      .expect(200);
    const allocations = Array.isArray(allocationsRes.body)
      ? allocationsRes.body
      : allocationsRes.body.data;
    expect(allocations.length).toBeGreaterThanOrEqual(1);
    const alloc = allocations.find((a: any) => a.order?.id === orderId || a.orderId === orderId);
    expect(alloc).toBeDefined();
    expect(Number(alloc.grossAmount)).toBe(50);
    expect(Number(alloc.commissionAmount)).toBe(2.5);
    expect(Number(alloc.netAmount)).toBe(47.5);
    expect(alloc.status).toBe(SellerAllocationStatus.PENDING_DELIVERY);

    // 4. Seller ships & buyer confirms delivery
    const salesRes = await request(httpServer)
      .get("/marketplace/sales")
      .set(authAs(seller))
      .expect(200);
    const sale = salesRes.body.data.find((s: any) => s.order?.id === orderId);

    await request(httpServer)
      .patch(`/marketplace/sales/${sale.id}/fulfillment`)
      .set(authAs(seller))
      .send({
        fulfillmentStatus: FulfillmentStatus.SHIPPED,
        carrier: "La Poste",
        trackingNumber: "LP-SETTLE-001",
      })
      .expect(200);

    // Buyer confirms item receipt
    await request(httpServer)
      .post(`/marketplace/orders/${orderId}/items/${orderItem.id}/confirm-receipt`)
      .set(authAs(buyer))
      .expect(201);

    // Allocation released to available balance
    const sellerSummaryAfterDelivery = await request(httpServer)
      .get("/marketplace/seller/settlement/summary")
      .set(authAs(seller))
      .expect(200);
    expect(Number(sellerSummaryAfterDelivery.body.balancePending)).toBe(0);
    expect(Number(sellerSummaryAfterDelivery.body.balanceAvailable)).toBe(47.5);

    // 5. Delivery-to-Collection Receipt Import (INT-03)
    const receiptPreview = await request(httpServer)
      .get(`/marketplace/orders/${orderId}/receipt-preview`)
      .set(authAs(buyer))
      .expect(200);

    expect(receiptPreview.body.orderId).toBe(orderId);
    expect(receiptPreview.body.items).toHaveLength(1);
    expect(receiptPreview.body.items[0].alreadyImported).toBe(false);

    // Import into collection
    const importRes = await request(httpServer)
      .post(`/marketplace/orders/${orderId}/import-to-collection`)
      .set(authAs(buyer))
      .send({
        items: [{ orderItemId: orderItem.id, condition: "NM" }],
      })
      .expect(200);

    expect(importRes.body.importedCount).toBe(1);
    expect(importRes.body.items[0].provenance).toMatchObject({
      source: "MARKETPLACE_ORDER",
      orderId,
      orderItemId: orderItem.id,
      sellerId: seller.id,
    });

    // Second preview indicates alreadyImported
    const receiptPreviewAfter = await request(httpServer)
      .get(`/marketplace/orders/${orderId}/receipt-preview`)
      .set(authAs(buyer))
      .expect(200);
    expect(receiptPreviewAfter.body.items[0].alreadyImported).toBe(true);

    // Duplicate import is rejected without allowDuplicates
    await request(httpServer)
      .post(`/marketplace/orders/${orderId}/import-to-collection`)
      .set(authAs(buyer))
      .send({
        items: [{ orderItemId: orderItem.id }],
        allowDuplicates: false,
      })
      .expect(400);

    // 6. Verified Seller Review (MKT-03)
    const reviewRes = await request(httpServer)
      .post(`/marketplace/orders/${orderId}/items/${orderItem.id}/review`)
      .set(authAs(buyer))
      .send({
        rating: 5,
        comment: "Carte impeccable conforme aux photos et emballage solide !",
      })
      .expect(200);

    expect(reviewRes.body.verifiedPurchase).toBe(true);
    expect(reviewRes.body.rating).toBe(5);

    // Seller profile reflects metrics
    const profileRes = await request(httpServer)
      .get(`/marketplace/sellers/${seller.id}/profile`)
      .expect(200);

    expect(profileRes.body.completedSalesCount).toBe(1);
    expect(profileRes.body.totalReviewsCount).toBe(1);
    expect(profileRes.body.averageRating).toBe(5);

    // 7. Seller Payout Lifecycle (MKT-06)
    // Update bank details
    await request(httpServer)
      .patch("/marketplace/seller/settlement/settings")
      .set(authAs(seller))
      .send({
        accountHolderName: "Settlement Seller",
        iban: "FR7612345678901234567890123",
        bic: "BNPAFRPP",
        bankName: "BNP Paribas",
      })
      .expect(200);

    // Request payout of 30 EUR
    const payoutRes = await request(httpServer)
      .post("/marketplace/seller/settlement/payouts")
      .set(authAs(seller))
      .send({ amount: 30 })
      .expect(201);

    expect(payoutRes.body.status).toBe(PayoutStatus.REQUESTED);
    expect(Number(payoutRes.body.amount)).toBe(30);

    // Available balance decremented to 17.50
    const summaryAfterPayoutReq = await request(httpServer)
      .get("/marketplace/seller/settlement/summary")
      .set(authAs(seller))
      .expect(200);
    expect(Number(summaryAfterPayoutReq.body.balanceAvailable)).toBe(17.5);

    // Admin processes and completes payout
    const payoutId = payoutRes.body.id;
    const processRes = await request(httpServer)
      .post(`/marketplace/admin/payouts/${payoutId}/process`)
      .set(authAs(admin))
      .send({
        action: "COMPLETE",
        transactionReference: "SEPA-EXEC-778899",
      })
      .expect(201);

    expect(processRes.body.status).toBe(PayoutStatus.COMPLETED);

    // Lifetime paid out balance updated
    const summaryFinal = await request(httpServer)
      .get("/marketplace/seller/settlement/summary")
      .set(authAs(seller))
      .expect(200);
    expect(Number(summaryFinal.body.balancePaidOut)).toBe(30);

    // 8. User Journey Next Actions (INT-04)
    const journeyRes = await request(httpServer)
      .get("/users/me/journey/next-actions")
      .set(authAs(buyer))
      .expect(200);

    expect(journeyRes.body.userId).toBe(buyer.id);
    expect(Array.isArray(journeyRes.body.actions)).toBe(true);
  });
});
