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
   * Cancels a payment intent that will never be captured.
   *
   * @param paymentIntentId - Stripe payment intent identifier.
   * @returns The cancelled payment intent.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.ensureInitialized();
    return this.stripe!.paymentIntents.cancel(paymentIntentId);
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

  /**
   * Issues a full or partial refund via Stripe.
   *
   * @param paymentIntentId - Stripe payment intent identifier.
   * @param amountCents - Optional refund amount in cents. If omitted, Stripe issues a full refund.
   * @param reason - Optional refund reason code.
   * @param idempotencyKey - Stable idempotency key to prevent duplicate refunds upon retries.
   * @param operationId - Durable local identity used to recover an ambiguous provider response.
   * @returns The created Stripe refund object.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
  async createRefund(
    paymentIntentId: string,
    amountCents?: number,
    reason?: Stripe.RefundCreateParams.Reason,
    idempotencyKey?: string,
    operationId?: string,
  ): Promise<Stripe.Refund> {
    this.ensureInitialized();
    return this.stripe!.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountCents === undefined ? undefined : Math.round(amountCents),
        reason,
        ...(operationId ? { metadata: { operationId } } : {}),
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  }
  /** Reads the authoritative outcome of one refund. */
  async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
    this.ensureInitialized();
    return this.stripe!.refunds.retrieve(refundId);
  }

  /** Reads every page; embedded charge refunds are only a partial history. */
  async listRefunds(paymentIntentId: string): Promise<Stripe.Refund[]> {
    this.ensureInitialized();
    const refunds: Stripe.Refund[] = [];
    for await (const refund of this.stripe!.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100,
    })) {
      refunds.push(refund);
    }
    return refunds;
  }

  /** Finds a committed remote refund even if its response never reached the application. */
  async findRefundForOperation(
    paymentIntentId: string,
    operationId: string,
  ): Promise<Stripe.Refund | undefined> {
    return (await this.listRefunds(paymentIntentId)).find(
      (refund) => refund.metadata?.operationId === operationId,
    );
  }

  /**
   * Disburses a reserved payout to a connected account.
   *
   * @param destinationAccountId - Connected account receiving the funds.
   * @param amountMinorUnits - Amount in the currency's minor units.
   * @param currency - ISO currency code.
   * @param idempotencyKey - Stable key so a retried disbursement is not paid twice.
   * @param payoutId - Durable local identity used to recover an ambiguous response.
   * @returns The created Stripe transfer.
   * @throws ServiceUnavailableException If Stripe is not configured.
   */
  async createTransfer(
    destinationAccountId: string,
    amountMinorUnits: number,
    currency: string,
    idempotencyKey: string,
    payoutId: string,
  ): Promise<Stripe.Transfer> {
    this.ensureInitialized();
    return this.stripe!.transfers.create(
      {
        destination: destinationAccountId,
        amount: Math.round(amountMinorUnits),
        currency: currency.toLowerCase(),
        metadata: { payoutId },
      },
      { idempotencyKey },
    );
  }

  /** Reads the authoritative state of one disbursement. */
  async retrieveTransfer(transferId: string): Promise<Stripe.Transfer> {
    this.ensureInitialized();
    return this.stripe!.transfers.retrieve(transferId);
  }

  /** Reads every page of the disbursements sent to one connected account. */
  async listTransfers(
    destinationAccountId: string,
  ): Promise<Stripe.Transfer[]> {
    this.ensureInitialized();
    const transfers: Stripe.Transfer[] = [];
    for await (const transfer of this.stripe!.transfers.list({
      destination: destinationAccountId,
      limit: 100,
    })) {
      transfers.push(transfer);
    }
    return transfers;
  }

  /** Finds a committed disbursement even if its response never reached the application. */
  async findTransferForPayout(
    destinationAccountId: string,
    payoutId: string,
  ): Promise<Stripe.Transfer | undefined> {
    return (await this.listTransfers(destinationAccountId)).find(
      (transfer) => transfer.metadata?.payoutId === payoutId,
    );
  }
}
