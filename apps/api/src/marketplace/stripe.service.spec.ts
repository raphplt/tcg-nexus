import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: jest.fn().mockResolvedValue({ id: 'pi' }) },
    webhooks: { constructEvent: jest.fn().mockReturnValue({ id: 'evt' }) }
  }));
});

describe('StripeService', () => {
  const configService = {
    get: jest.fn()
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should warn when secret missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (configService.get as jest.Mock).mockReturnValueOnce(undefined);
    const service = new StripeService(configService);
    expect(service).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith('STRIPE_SECRET_KEY is not defined');
    warnSpy.mockRestore();
  });

  it('should create payment intent', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce('sk_test');
    const service = new StripeService(configService);
    const result = await service.createPaymentIntent(10.5, 'usd', { order: 1 });
    const stripeInstance = (Stripe as unknown as jest.Mock).mock.results[0]
      .value;
    expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1050,
        currency: 'usd',
        metadata: { order: 1 }
      })
    );
    expect(result).toEqual({ id: 'pi' });
  });

  it('should construct event from payload', async () => {
    (configService.get as jest.Mock).mockReturnValueOnce('sk_test'); // for constructor
    (configService.get as jest.Mock).mockReturnValueOnce('whsec'); // for webhook
    const service = new StripeService(configService);
    const result = await service.constructEventFromPayload(
      'sig',
      Buffer.from('payload')
    );
    const stripeInstance = (Stripe as unknown as jest.Mock).mock.results.slice(
      -1
    )[0].value;
    expect(stripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('payload'),
      'sig',
      'whsec'
    );
    expect(result).toEqual({ id: 'evt' });
  });
});
