import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Currency } from "../common/enums/currency";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import { User } from "../user/entities/user.entity";
import { UserCartService } from "../user_cart/user_cart.service";
import { CardPopularityService } from "./card-popularity.service";
import { Listing } from "./entities/listing.entity";
import { Order, OrderStatus } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import {
  PaymentStatus,
  PaymentTransaction,
} from "./entities/payment-transaction.entity";
import { OrderService } from "./order.service";
import { StripeService } from "./stripe.service";

describe("OrderService", () => {
  let service: OrderService;
  let orderRepo: any;
  let orderItemRepo: any;
  let paymentRepo: any;
  let stripeService: any;
  let userCartService: any;
  let eventEmitter: any;
  let manager: any;

  const buyer = { id: 1, firstName: "Ada", lastName: "L" } as User;

  const buildCartItem = (overrides: any = {}) => ({
    id: 1,
    quantity: 2,
    listing: {
      id: 10,
      price: 10,
      currency: Currency.EUR,
      quantityAvailable: 5,
      cardState: "NM",
      language: "fr",
      expiresAt: null,
      seller: { id: 2, firstName: "Bob", lastName: "Seller" },
      pokemonCard: { id: "card-1", name: "Pikachu", set: { name: "Base" } },
      ...overrides,
    },
  });

  beforeEach(async () => {
    manager = {
      findOne: jest.fn(),
      create: jest.fn((_cls, data) => ({ ...data })),
      save: jest.fn(async (_cls, entity) => ({ id: 100, ...entity })),
      decrement: jest.fn(),
      increment: jest.fn(),
    };

    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (o) => o),
      createQueryBuilder: jest.fn(),
    };

    orderItemRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (i) => i),
      createQueryBuilder: jest.fn(),
    };

    paymentRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (p) => p),
      findOne: jest.fn(),
    };

    stripeService = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        id: "pi_123",
        client_secret: "secret_123",
      }),
      retrievePaymentIntent: jest.fn(),
    };

    userCartService = {
      findCartByUserId: jest.fn(),
      clearCart: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: paymentRepo,
        },
        { provide: getRepositoryToken(Listing), useValue: {} },
        { provide: StripeService, useValue: stripeService },
        { provide: UserCartService, useValue: userCartService },
        {
          provide: CardPopularityService,
          useValue: { recordEvent: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb) => cb(manager)),
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe("startCheckout", () => {
    const dto = { shippingAddress: "12 rue des Cartes, 75001 Paris" };

    it("reserves stock and creates the order before charging the buyer", async () => {
      const item = buildCartItem();
      userCartService.findCartByUserId.mockResolvedValue({ cartItems: [item] });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 10,
        quantityAvailable: 5,
        expiresAt: null,
      });

      const result = await service.startCheckout(dto, buyer);

      expect(manager.decrement).toHaveBeenCalledWith(
        Listing,
        { id: 10 },
        "quantityAvailable",
        2,
      );
      const savedOrder = manager.save.mock.calls[0][1];
      expect(savedOrder.status).toBe(OrderStatus.PENDING);
      expect(savedOrder.shippingAddress).toBe(dto.shippingAddress);
      expect(savedOrder.totalAmount).toBe(20);
      expect(savedOrder.reservationExpiresAt).toBeInstanceOf(Date);

      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        20,
        Currency.EUR,
        { orderId: "100", userId: "1" },
        "order-100",
      );
      expect(result.clientSecret).toBe("secret_123");
      expect(userCartService.clearCart).toHaveBeenCalledWith(buyer.id);
    });

    it("snapshots the product so the order survives listing changes", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem()],
      });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 10,
        quantityAvailable: 5,
        expiresAt: null,
      });

      await service.startCheckout(dto, buyer);

      const savedOrder = manager.save.mock.calls[0][1];
      expect(savedOrder.orderItems[0]).toEqual(
        expect.objectContaining({
          productName: "Pikachu",
          productCondition: "NM",
          productLanguage: "fr",
          productSetName: "Base",
          sellerName: "Bob Seller",
          unitPrice: 10,
          quantity: 2,
        }),
      );
    });

    it("prices the order from the database, not from the cart snapshot", async () => {
      const item = buildCartItem();
      userCartService.findCartByUserId.mockResolvedValue({ cartItems: [item] });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 25,
        quantityAvailable: 5,
        expiresAt: null,
      });

      await service.startCheckout(dto, buyer);

      expect(manager.save.mock.calls[0][1].totalAmount).toBe(50);
    });

    it("charges a seller's shipping once, at their highest declared rate", async () => {
      const bobA = buildCartItem();
      const bobB = { ...buildCartItem(), id: 2 };
      bobB.listing = { ...bobB.listing, id: 11 };
      const carol = { ...buildCartItem(), id: 3 };
      carol.listing = { ...carol.listing, id: 12, seller: { id: 3 } };

      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [bobA, bobB, carol],
      });
      const shippingByListing: Record<number, number> = {
        10: 3,
        11: 4.5,
        12: 2,
      };
      manager.findOne.mockImplementation(async (_cls: any, options: any) => ({
        id: options.where.id,
        price: 10,
        quantityAvailable: 5,
        expiresAt: null,
        shippingCost: shippingByListing[options.where.id],
        handlingTimeDays: 5,
      }));

      await service.startCheckout(dto, buyer);

      const savedOrder = manager.save.mock.calls[0][1];
      // 4.50 for Bob (highest rate of his two listings) + 2 for Carol
      expect(savedOrder.shippingAmount).toBe(6.5);
      expect(savedOrder.totalAmount).toBe(66.5);
      expect(savedOrder.orderItems.map((i: any) => i.shippingCost)).toEqual([
        0, 4.5, 2,
      ]);
      expect(savedOrder.orderItems[0].handlingTimeDays).toBe(5);
    });

    it("keeps free shipping free", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem()],
      });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 10,
        quantityAvailable: 5,
        expiresAt: null,
        shippingCost: 0,
      });

      await service.startCheckout(dto, buyer);

      const savedOrder = manager.save.mock.calls[0][1];
      expect(savedOrder.shippingAmount).toBe(0);
      expect(savedOrder.totalAmount).toBe(20);
    });

    it("rejects an empty cart", async () => {
      userCartService.findCartByUserId.mockResolvedValue({ cartItems: [] });
      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects buying one's own listing", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem({ seller: { id: buyer.id } })],
      });
      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects a cart mixing currencies", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [
          buildCartItem(),
          buildCartItem({ id: 11, currency: Currency.USD }),
        ],
      });
      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects insufficient stock", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem()],
      });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 10,
        quantityAvailable: 1,
        expiresAt: null,
      });
      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects an expired listing", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem()],
      });
      manager.findOne.mockResolvedValue({
        id: 10,
        price: 10,
        quantityAvailable: 5,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("releases the reservation when Stripe refuses the payment intent", async () => {
      userCartService.findCartByUserId.mockResolvedValue({
        cartItems: [buildCartItem()],
      });
      const pendingOrder = {
        id: 100,
        status: OrderStatus.PENDING,
        stockReleased: false,
        orderItems: [{ listing: { id: 10 }, quantity: 2 }],
        buyer,
      };
      // transitionOrder verrouille la ligne puis la recharge avec ses relations
      manager.findOne.mockImplementation(async (entity: any) =>
        entity === Listing
          ? { id: 10, price: 10, quantityAvailable: 5, expiresAt: null }
          : pendingOrder,
      );
      stripeService.createPaymentIntent.mockRejectedValue(
        new Error("stripe down"),
      );

      await expect(service.startCheckout(dto, buyer)).rejects.toThrow(
        "stripe down",
      );
      expect(manager.increment).toHaveBeenCalledWith(
        Listing,
        { id: 10 },
        "quantityAvailable",
        2,
      );
    });
  });

  describe("payment confirmation", () => {
    const paidIntent = {
      amount: 2000,
      currency: "eur",
      metadata: { orderId: "100", userId: "1" },
    };

    const pendingOrder = () => ({
      id: 100,
      status: OrderStatus.PENDING,
      totalAmount: 20,
      currency: Currency.EUR,
      buyer,
      orderItems: [
        {
          seller: { id: 2 },
          unitPrice: 10,
          quantity: 2,
          listing: { id: 10, pokemonCard: { id: "card-1" } },
        },
      ],
    });

    /**
     * markOrderPaid locks the payment row inside a transaction: it first reads
     * the bare payment, then re-reads it with its order relation.
     */
    const mockLockedPayment = (
      order: any,
      status = PaymentStatus.INITIATED,
    ) => {
      const payment = { id: 1, transactionId: "pi_123", status };
      manager.findOne.mockImplementation(async (_entity: any, options: any) =>
        options?.relations ? { ...payment, order } : payment,
      );
      return payment;
    };

    it("marks the order paid once the webhook confirms the intent", async () => {
      const order = pendingOrder();
      mockLockedPayment(order);

      await service.handlePaymentSucceeded("pi_123", paidIntent);

      expect(order.status).toBe(OrderStatus.PAID);
      expect(manager.save).toHaveBeenCalledWith(order);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "marketplace.sale",
        expect.objectContaining({ sellerUserId: 2, total: 20 }),
      );
    });

    it("locks the payment row before deciding whether the order is already paid", async () => {
      mockLockedPayment(pendingOrder());

      await service.handlePaymentSucceeded("pi_123", paidIntent);

      expect(manager.findOne).toHaveBeenCalledWith(
        PaymentTransaction,
        expect.objectContaining({
          lock: { mode: "pessimistic_write" },
        }),
      );
    });

    it("is idempotent when the webhook is replayed", async () => {
      const order = { ...pendingOrder(), status: OrderStatus.PAID };
      mockLockedPayment(order, PaymentStatus.COMPLETED);

      await service.handlePaymentSucceeded("pi_123", paidIntent);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("refuses an intent whose amount differs from the order", async () => {
      mockLockedPayment(pendingOrder());

      await expect(
        service.handlePaymentSucceeded("pi_123", {
          ...paidIntent,
          amount: 500,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses an intent in another currency", async () => {
      mockLockedPayment(pendingOrder());

      await expect(
        service.handlePaymentSucceeded("pi_123", {
          ...paidIntent,
          currency: "usd",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses an intent opened by another buyer", async () => {
      mockLockedPayment(pendingOrder());

      await expect(
        service.handlePaymentSucceeded("pi_123", {
          ...paidIntent,
          metadata: { orderId: "100", userId: "999" },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses an intent bound to another order", async () => {
      mockLockedPayment(pendingOrder());

      await expect(
        service.handlePaymentSucceeded("pi_123", {
          ...paidIntent,
          metadata: { orderId: "777", userId: "1" },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("confirms from Stripe rather than trusting the client", async () => {
      const order = pendingOrder();
      orderRepo.findOne.mockResolvedValue(order);
      paymentRepo.findOne.mockResolvedValue({ transactionId: "pi_123" });
      mockLockedPayment(order);
      stripeService.retrievePaymentIntent.mockResolvedValue({
        status: "succeeded",
        ...paidIntent,
      });

      await service.confirmOrderPayment(100, buyer);

      expect(stripeService.retrievePaymentIntent).toHaveBeenCalledWith(
        "pi_123",
      );
      expect(order.status).toBe(OrderStatus.PAID);
    });

    it("refuses to confirm an order that is not paid on Stripe's side", async () => {
      orderRepo.findOne.mockResolvedValue(pendingOrder());
      paymentRepo.findOne.mockResolvedValue({ transactionId: "pi_123" });
      stripeService.retrievePaymentIntent.mockResolvedValue({
        status: "requires_payment_method",
      });

      await expect(service.confirmOrderPayment(100, buyer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("transitionOrder", () => {
    const orderIn = (status: OrderStatus, extra: any = {}) => ({
      id: 100,
      status,
      stockReleased: false,
      buyer,
      orderItems: [{ listing: { id: 10 }, quantity: 2 }],
      ...extra,
    });

    it("refuses a transition that is not allowed", async () => {
      manager.findOne.mockResolvedValue(orderIn(OrderStatus.CANCELLED));
      await expect(
        service.transitionOrder(100, OrderStatus.PAID),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuses to ship an unpaid order", async () => {
      manager.findOne.mockResolvedValue(orderIn(OrderStatus.PENDING));
      await expect(
        service.transitionOrder(100, OrderStatus.SHIPPED),
      ).rejects.toThrow(BadRequestException);
    });

    it("restores stock when an order is refunded", async () => {
      manager.findOne.mockResolvedValue(orderIn(OrderStatus.PAID));

      await service.transitionOrder(100, OrderStatus.REFUNDED);

      expect(manager.increment).toHaveBeenCalledWith(
        Listing,
        { id: 10 },
        "quantityAvailable",
        2,
      );
    });

    it("never restores stock twice", async () => {
      manager.findOne.mockResolvedValue(
        orderIn(OrderStatus.PAID, { stockReleased: true }),
      );

      await service.transitionOrder(100, OrderStatus.REFUNDED);

      expect(manager.increment).not.toHaveBeenCalled();
    });
  });

  describe("expireStaleReservations", () => {
    it("cancels pending orders whose reservation lapsed", async () => {
      orderRepo.find.mockResolvedValue([{ id: 100 }]);
      manager.findOne.mockResolvedValue({
        id: 100,
        status: OrderStatus.PENDING,
        stockReleased: false,
        buyer,
        orderItems: [{ listing: { id: 10 }, quantity: 2 }],
      });

      const released = await service.expireStaleReservations();

      expect(released).toBe(1);
      expect(manager.increment).toHaveBeenCalled();
    });
  });

  describe("updateFulfillment", () => {
    const sellerUser = { id: 2 } as User;

    const orderItem = (overrides: any = {}) => ({
      id: 7,
      seller: { id: 2 },
      fulfillmentStatus: FulfillmentStatus.TO_SHIP,
      order: { id: 100, status: OrderStatus.PAID, buyer },
      ...overrides,
    });

    it("refuses a seller acting on someone else's sale", async () => {
      orderItemRepo.findOne.mockResolvedValue(
        orderItem({ seller: { id: 42 } }),
      );

      await expect(
        service.updateFulfillment(
          7,
          { fulfillmentStatus: FulfillmentStatus.SHIPPED },
          sellerUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuses shipping an unpaid order", async () => {
      orderItemRepo.findOne.mockResolvedValue(
        orderItem({ order: { id: 100, status: OrderStatus.PENDING, buyer } }),
      );

      await expect(
        service.updateFulfillment(
          7,
          {
            fulfillmentStatus: FulfillmentStatus.SHIPPED,
            carrier: "Colissimo",
            trackingNumber: "ABC123",
          },
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("requires a carrier and tracking number to mark a sale shipped", async () => {
      orderItemRepo.findOne.mockResolvedValue(orderItem());

      await expect(
        service.updateFulfillment(
          7,
          { fulfillmentStatus: FulfillmentStatus.SHIPPED },
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("records the shipment", async () => {
      const item = orderItem();
      orderItemRepo.findOne.mockResolvedValue(item);
      orderItemRepo.find.mockResolvedValue([
        { fulfillmentStatus: FulfillmentStatus.SHIPPED },
      ]);
      manager.findOne.mockResolvedValue({
        id: 100,
        status: OrderStatus.PAID,
        stockReleased: false,
        buyer,
        orderItems: [],
      });

      await service.updateFulfillment(
        7,
        {
          fulfillmentStatus: FulfillmentStatus.SHIPPED,
          carrier: "Colissimo",
          trackingNumber: "ABC123",
        },
        sellerUser,
      );

      expect(item.fulfillmentStatus).toBe(FulfillmentStatus.SHIPPED);
      expect(item.carrier).toBe("Colissimo");
      expect(item.shippedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "order.shipped",
        expect.objectContaining({ orderId: 100 }),
      );
    });

    it("refuses an invalid fulfillment transition", async () => {
      orderItemRepo.findOne.mockResolvedValue(
        orderItem({ fulfillmentStatus: FulfillmentStatus.DELIVERED }),
      );

      await expect(
        service.updateFulfillment(
          7,
          { fulfillmentStatus: FulfillmentStatus.PREPARING },
          sellerUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findOrderById", () => {
    it("forbids reading someone else's order", async () => {
      orderRepo.findOne.mockResolvedValue({ id: 1, buyer: { id: 99 } });
      await expect(service.findOrderById(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
