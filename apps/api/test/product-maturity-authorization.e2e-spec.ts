import { Card } from "../src/card/entities/card.entity";
import { CardGame } from "../src/common/enums/cardGame";
import {
  PaymentTransaction,
  PaymentStatus,
  PaymentMethod,
} from "../src/marketplace/entities/payment-transaction.entity";
import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { Currency } from "../src/common/enums/currency";
import { DeckCardRole } from "../src/common/enums/deckCardRole";
import { RefundStatus } from "../src/common/enums/refund-status";
import { DeckCard } from "../src/deck-card/entities/deck-card.entity";
import { Deck } from "../src/deck/entities/deck.entity";
import { OrderItem } from "../src/marketplace/entities/order-item.entity";
import { Order, OrderStatus } from "../src/marketplace/entities/order.entity";
import { RefundLine } from "../src/marketplace/entities/refund-line.entity";
import { RefundOperation } from "../src/marketplace/entities/refund-operation.entity";
import { ReturnItem } from "../src/marketplace/entities/return-item.entity";
import { StripeService } from "../src/marketplace/stripe.service";
import { createE2eApp } from "./helpers/app";
import { createAdminUser, createUser, TestUser } from "./helpers/auth";
import { seedListingForSeller } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Product maturity authorization boundaries (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let buyer: TestUser;
  let seller: TestUser;
  let otherSeller: TestUser;
  let outsider: TestUser;
  let admin: TestUser;
  let order: Order;
  let ownItem: OrderItem;
  let otherItem: OrderItem;
  let privateDeck: Deck;
  let publicDeck: Deck;
  let listingId: number;
  const providerRefund = jest
    .fn()
    .mockResolvedValue({ id: "re_auth_test", status: "succeeded" });
  const auth = (user: TestUser) => ({
    Authorization: `Bearer ${user.accessToken}`,
  });

  beforeAll(async () => {
    ({ app } = await createE2eApp({
      providerOverrides: [
        {
          provide: StripeService,
          useValue: { onModuleInit: jest.fn(), createRefund: providerRefund },
        },
      ],
    }));
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    buyer = await createUser(server);
    seller = await createUser(server);
    otherSeller = await createUser(server);
    outsider = await createUser(server);
    admin = await createAdminUser(server, app);
    order = await database.getRepository(Order).save({
      buyer: { id: buyer.id },
      totalAmount: 100,
      shippingAmount: 0,
      currency: Currency.EUR,
      status: OrderStatus.PAID,
    });
    await database.getRepository(PaymentTransaction).save({
      order,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.COMPLETED,
      transactionId: `pi_auth_${order.id}`,
      amount: 100,
      currency: Currency.EUR,
    });
    ownItem = await database.getRepository(OrderItem).save({
      order,
      seller: { id: seller.id },
      quantity: 1,
      unitPrice: 40,
      shippingCost: 0,
    });
    otherItem = await database.getRepository(OrderItem).save({
      order,
      seller: { id: otherSeller.id },
      quantity: 1,
      unitPrice: 60,
      shippingCost: 0,
    });
    const refund = await database.getRepository(RefundOperation).save({
      order,
      amount: 30,
      currency: "EUR",
      status: RefundStatus.SUCCEEDED,
      reason: "Private multi-seller reason",
      createdBy: { id: admin.id },
    });
    await database.getRepository(RefundLine).save([
      {
        refundOperation: refund,
        orderItem: ownItem,
        quantity: 1,
        amount: 10,
        shippingAmount: 0,
      },
      {
        refundOperation: refund,
        orderItem: otherItem,
        quantity: 1,
        amount: 20,
        shippingAmount: 0,
      },
    ]);
    await database.getRepository(ReturnItem).save([
      { orderItem: ownItem, quantity: 1, reason: "First seller return" },
      {
        orderItem: otherItem,
        quantity: 1,
        reason: "Other seller private return",
      },
    ]);
    const card = await database
      .getRepository(Card)
      .save({ name: "Authorization fixture card", game: CardGame.Pokemon });
    listingId = await seedListingForSeller(app, seller, { pokemonCard: card });
    privateDeck = await database.getRepository(Deck).save({
      name: "Private submitted strategy",
      user: { id: buyer.id },
      isPublic: false,
    });
    publicDeck = await database.getRepository(Deck).save({
      name: "Shared strategy",
      user: { id: buyer.id },
      isPublic: true,
    });
    await database.getRepository(DeckCard).save([
      { deck: privateDeck, card, qty: 2, role: DeckCardRole.main },
      { deck: publicDeck, card, qty: 2, role: DeckCardRole.main },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    "refunds",
    "refunds/remaining",
    "returns",
  ])("rejects an unrelated account reading %s", async (suffix) => {
    await request(server)
      .get(`/marketplace/orders/${order.id}/${suffix}`)
      .set(auth(outsider))
      .expect(403);
    await request(server)
      .get(`/marketplace/orders/${order.id}/${suffix}`)
      .expect(401);
  });

  it.each([
    "refunds",
    "refunds/remaining",
    "returns",
  ])("preserves buyer and staff access to %s", async (suffix) => {
    await request(server)
      .get(`/marketplace/orders/${order.id}/${suffix}`)
      .set(auth(buyer))
      .expect(200);
    await request(server)
      .get(`/marketplace/orders/${order.id}/${suffix}`)
      .set(auth(admin))
      .expect(200);
  });

  it("exposes only the seller's own lines and amounts in shared refund operations", async () => {
    const response = await request(server)
      .get(`/marketplace/orders/${order.id}/refunds`)
      .set(auth(seller))
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(Number(response.body[0].amount)).toBe(10);
    expect(response.body[0].refundLines).toHaveLength(1);
    expect(response.body[0].refundLines[0].orderItem.id).toBe(ownItem.id);
    expect(response.body[0].reason).toBeNull();
    expect(response.body[0].createdBy).toBeNull();
    const buyerView = await request(server)
      .get(`/marketplace/orders/${order.id}/refunds`)
      .set(auth(buyer))
      .expect(200);
    expect(buyerView.body[0].refundLines).toHaveLength(2);
    expect(Number(buyerView.body[0].amount)).toBe(30);
  });

  it("calculates the seller allowance without disclosing the other seller's balance", async () => {
    const response = await request(server)
      .get(`/marketplace/orders/${order.id}/refunds/remaining`)
      .set(auth(seller))
      .expect(200);
    expect(response.body).toEqual({
      totalAmount: 40,
      alreadyRefunded: 10,
      remainingAmount: 30,
    });
  });

  it("filters physical return details to the requesting seller", async () => {
    const response = await request(server)
      .get(`/marketplace/orders/${order.id}/returns`)
      .set(auth(seller))
      .expect(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].orderItem.id).toBe(ownItem.id);
    expect(JSON.stringify(response.body)).not.toContain(
      "Other seller private return",
    );
  });

  it("rejects another seller's refund line before any provider or database mutation", async () => {
    const before = await database.getRepository(RefundOperation).count();
    await request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(seller))
      .send({ lines: [{ orderItemId: otherItem.id, quantity: 1, amount: 1 }] })
      .expect(403);
    expect(providerRefund).not.toHaveBeenCalled();
    expect(await database.getRepository(RefundOperation).count()).toBe(before);
  });

  it("rejects order-wide seller refunds and invalid staff line IDs before contacting the provider", async () => {
    await request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(seller))
      .send({ amount: 1 })
      .expect(400);
    await request(server)
      .post(`/marketplace/orders/${order.id}/refund`)
      .set(auth(admin))
      .send({ lines: [{ orderItemId: 2147483647, quantity: 1, amount: 1 }] })
      .expect(400);
    expect(providerRefund).not.toHaveBeenCalled();
  });

  it("hides private deck requirements from other authenticated users", async () => {
    await request(server)
      .get(`/deck/${privateDeck.id}/inventory-requirements`)
      .set(auth(outsider))
      .expect(404);
  });

  it("allows the private deck owner to resolve missing copies and real offers", async () => {
    const response = await request(server)
      .get(`/deck/${privateDeck.id}/inventory-requirements`)
      .set(auth(buyer))
      .expect(200);
    expect(response.body.totalCardsMissing).toBe(2);
    expect(response.body.cards[0].offers).toEqual(
      expect.arrayContaining([expect.objectContaining({ listingId })]),
    );
  });

  it("allows authenticated users to compare a public deck", async () => {
    const response = await request(server)
      .get(`/deck/${publicDeck.id}/inventory-requirements`)
      .set(auth(outsider))
      .expect(200);
    expect(response.body.totalCardsRequired).toBe(2);
  });
});
