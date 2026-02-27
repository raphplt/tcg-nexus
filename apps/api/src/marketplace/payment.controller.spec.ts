import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { StripeService } from './stripe.service';
import { UserCartService } from '../user_cart/user_cart.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  const stripeService = {
    createPaymentIntent: jest.fn()
  } as unknown as StripeService;

  const userCartService = {
    findCartByUserId: jest.fn()
  } as unknown as UserCartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: StripeService, useValue: stripeService },
        { provide: UserCartService, useValue: userCartService }
      ]
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    jest.clearAllMocks();
  });

  it('should create payment intent from cart and return client secret', async () => {
    (userCartService.findCartByUserId as jest.Mock).mockResolvedValue({
      cartItems: [
        {
          listing: { price: 10, currency: 'EUR', seller: { id: 2 } },
          quantity: 1
        }
      ]
    });
    (stripeService.createPaymentIntent as jest.Mock).mockResolvedValue({
      client_secret: 'secret'
    });

    const res = await controller.createPaymentIntent(
      {} as any,
      { id: 1 } as any
    );

    expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    expect(res.clientSecret).toBe('secret');
  });
});
