import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OrderService } from "./order.service";
import { StripeService } from "./stripe.service";
import { WebhookController } from "./webhook.controller";

describe("WebhookController", () => {
  let controller: WebhookController;
  const stripeService = {
    constructEventFromPayload: jest.fn(),
  } as unknown as StripeService;
  const orderService = {
    handlePaymentSucceeded: jest.fn(),
    handlePaymentFailed: jest.fn(),
    handlePaymentRefunded: jest.fn(),
  } as unknown as OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: StripeService, useValue: stripeService },
        { provide: OrderService, useValue: orderService },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    jest.clearAllMocks();
  });

  it("should throw when signature missing", async () => {
    await expect(
      controller.handleWebhook(
        undefined as any,
        { rawBody: Buffer.from("x") } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when raw body missing", async () => {
    await expect(controller.handleWebhook("sig", {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should handle event and return received", async () => {
    (stripeService.constructEventFromPayload as jest.Mock).mockResolvedValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi",
          amount: 1000,
          currency: "eur",
          metadata: { orderId: "5" },
        },
      },
    });

    const res = await controller.handleWebhook("sig", {
      rawBody: Buffer.from("payload"),
    } as any);

    expect(res).toEqual({ received: true });
    expect(orderService.handlePaymentSucceeded).toHaveBeenCalledWith("pi", {
      amount: 1000,
      currency: "eur",
      metadata: { orderId: "5" },
    });
  });

  it("propagates a processing failure so Stripe retries the event", async () => {
    (stripeService.constructEventFromPayload as jest.Mock).mockResolvedValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi", amount: 1000, currency: "eur" } },
    });
    (orderService.handlePaymentSucceeded as jest.Mock).mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      controller.handleWebhook("sig", {
        rawBody: Buffer.from("payload"),
      } as any),
    ).rejects.toThrow("database unavailable");
  });

  it("should propagate error from stripe construction", async () => {
    (stripeService.constructEventFromPayload as jest.Mock).mockRejectedValue(
      new Error("fail"),
    );
    await expect(
      controller.handleWebhook("sig", { rawBody: Buffer.from("p") } as any),
    ).rejects.toThrow("Webhook Error: fail");
  });
});
