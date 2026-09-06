import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { User } from "../user/entities/user.entity";
import { Currency } from "../common/enums/currency";

describe("OrderController", () => {
  let controller: OrderController;
  let orderService: jest.Mocked<Partial<OrderService>>;

  const mockUser = { id: 1, email: "buyer@test.com" } as User;

  beforeEach(async () => {
    orderService = {
      startCheckout: jest.fn(),
      findPendingCheckoutSession: jest.fn(),
      confirmOrderPayment: jest.fn(),
      cancelPendingOrderByBuyer: jest.fn(),
      findOrdersByBuyerId: jest.fn(),
      findSalesBySellerId: jest.fn(),
      getSellerRevenue: jest.fn(),
      findOrderById: jest.fn(),
      findAllOrders: jest.fn(),
      findOrderByIdAsAdmin: jest.fn(),
      transitionOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderController>(OrderController);
  });

  it("calls orderService.startCheckout", async () => {
    const dto = { shippingAddress: "12 rue des Cartes", attemptKey: "att-1" };
    const expected = {
      orderId: 10,
      clientSecret: "sec_1",
      amount: 50,
      shippingAmount: 5,
      currency: Currency.EUR,
    };
    (orderService.startCheckout as jest.Mock).mockResolvedValue(expected);

    const result = await controller.startCheckout(dto, mockUser);
    expect(orderService.startCheckout).toHaveBeenCalledWith(dto, mockUser);
    expect(result).toEqual(expected);
  });

  it("calls orderService.findPendingCheckoutSession", async () => {
    const expected = {
      orderId: 10,
      clientSecret: "sec_1",
      amount: 50,
      shippingAmount: 5,
      currency: Currency.EUR,
      shippingAddress: "12 rue des Cartes",
      reservationExpiresAt: new Date(),
      items: [],
    };
    (orderService.findPendingCheckoutSession as jest.Mock).mockResolvedValue(expected);

    const result = await controller.getPendingCheckout(mockUser);
    expect(orderService.findPendingCheckoutSession).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual(expected);
  });

  it("calls orderService.cancelPendingOrderByBuyer", async () => {
    (orderService.cancelPendingOrderByBuyer as jest.Mock).mockResolvedValue({
      success: true,
      orderId: 10,
    });

    const result = await controller.cancelPendingOrder(10, mockUser);
    expect(orderService.cancelPendingOrderByBuyer).toHaveBeenCalledWith(10, mockUser);
    expect(result).toEqual({ success: true, orderId: 10 });
  });

  it("calls orderService.confirmOrderPayment", async () => {
    const expected = { id: 10 } as any;
    (orderService.confirmOrderPayment as jest.Mock).mockResolvedValue(expected);

    const result = await controller.confirmOrder(10, mockUser);
    expect(orderService.confirmOrderPayment).toHaveBeenCalledWith(10, mockUser);
    expect(result).toEqual(expected);
  });
});
