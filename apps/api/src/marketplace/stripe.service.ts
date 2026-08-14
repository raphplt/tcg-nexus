import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

/**
 * Provides Stripe payment operations when the service is configured.
 *
 * The API can still start without Stripe credentials so non-payment features
 * remain available in development and end-to-end test environments.
 */
@Injectable()
export class StripeService implements OnModuleInit {
  private stripe?: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private initialized = false;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      this.logger.warn(
        "STRIPE_SECRET_KEY is not defined — Stripe payments will not work",
      );
    }
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.initialized = true;
    }
  }

  /**
   * Reports a missing Stripe configuration without preventing application startup.
   */
  async onModuleInit() {
    if (!this.initialized) {
      this.logger.error(
        "Stripe is not properly configured. Set STRIPE_SECRET_KEY in environment variables.",
      );
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new ServiceUnavailableException(
        "Le paiement est momentanément indisponible (Stripe non configuré).",
      );
    }
  }

  /**
   * Creates a Stripe payment intent for an order.
   *
   * @param amount - Payment amount in the provided currency's major unit.
   * @param currency - ISO currency code.
   * @param metadata - Metadata persisted alongside the payment intent.
   * @param idempotencyKey - Stable key so a retried checkout reuses the same intent instead of charging twice.
   * @returns The created Stripe payment intent.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string> = {},
    idempotencyKey?: string,
  ) {
    this.ensureInitialized();
    return this.stripe!.paymentIntents.create(
      {
        amount: Math.round(amount * 100), // Convert major units to cents.
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  }

  /**
   * Retrieves a payment intent from Stripe.
   *
   * @param paymentIntentId - Stripe payment intent identifier.
   * @returns The matching Stripe payment intent.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.ensureInitialized();
    return this.stripe!.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Validates and parses a Stripe webhook event.
   *
   * @param signature - Stripe webhook signature header.
   * @param payload - Raw webhook request payload.
   * @returns The validated Stripe event.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
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
    return this.stripe!.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
