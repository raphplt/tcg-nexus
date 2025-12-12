import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { StripeService } from './stripe.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  const stripeService = {
    createPaymentIntent: jest.fn()
  } as unknown as StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: StripeService, useValue: stripeService }]
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    jest.clearAllMocks();
  });

  it('should create payment intent and return client secret', async () => {
    (stripeService.createPaymentIntent as jest.Mock).mockResolvedValue({
      client_secret: 'secret'
    });
    const res = await controller.createPaymentIntent({
      amount: 10,
      currency: 'usd',
      metadata: { order: 1 }
    } as any);

    expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    expect(res.clientSecret).toBe('secret');
  });
});
