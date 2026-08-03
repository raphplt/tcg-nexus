import {
  BadRequestException,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import Stripe from "stripe";
import { Public } from "../auth/decorators/public.decorator";
import { OrderService } from "./order.service";
import { StripeService } from "./stripe.service";

@ApiTags("webhook")
@Controller("webhook")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly orderService: OrderService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() request: Request,
  ) {
    if (!signature) {
      throw new BadRequestException("Missing stripe-signature header");
    }

    const rawBody = (request as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        "Raw body not available. Ensure rawBody is set to true in main.ts",
      );
    }

    let event: Stripe.Event;
    try {
      event = await this.stripeService.constructEventFromPayload(
        signature,
        rawBody as Buffer,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.log(
            `PaymentIntent succeeded: ${paymentIntent.id} for amount ${paymentIntent.amount}`,
          );
          // L'événement Stripe fait foi : montant, devise et metadata sont
          // revérifiés contre la commande avant de la passer à PAID.
          await this.orderService.handlePaymentSucceeded(paymentIntent.id, {
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
          });
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.warn(
            `PaymentIntent failed: ${paymentIntent.id} — ${paymentIntent.last_payment_error?.message}`,
          );
          await this.orderService.handlePaymentFailed(paymentIntent.id);
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          this.logger.log(
            `Charge refunded: ${charge.id} for PaymentIntent ${charge.payment_intent}`,
          );
          if (charge.payment_intent) {
            await this.orderService.handlePaymentRefunded(
              charge.payment_intent as string,
            );
          }
          break;
        }

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(
        `Error processing webhook event ${event.type}: ${err.message}`,
        err.stack,
      );
    }

    return { received: true };
  }
}
