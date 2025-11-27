import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      console.warn('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(secretKey || '');
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: any = {}
  ) {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), //centimes
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });
  }

  async constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET'
    );
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret || ''
    );
  }
}
