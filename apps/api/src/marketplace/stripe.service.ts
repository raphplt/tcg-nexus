import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private initialized = false;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      this.logger.warn(
        "STRIPE_SECRET_KEY is not defined — Stripe payments will not work",
      );
    }
    this.stripe = new Stripe(secretKey || "");
    this.initialized = !!secretKey;
  }

  async onModuleInit() {
    if (!this.initialized) {
      this.logger.error(
        "Stripe is not properly configured. Set STRIPE_SECRET_KEY in environment variables.",
      );
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error(
        "Stripe is not configured. Payment operations are unavailable.",
      );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string> = {},
  ) {
    this.ensureInitialized();
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // centimes
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.ensureInitialized();
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async constructEventFromPayload(
    signature: string,
    payload: Buffer,
  ): Promise<Stripe.Event> {
    this.ensureInitialized();
    const webhookSecret = this.configService.get<string>(
      "STRIPE_WEBHOOK_SECRET",
    );
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
