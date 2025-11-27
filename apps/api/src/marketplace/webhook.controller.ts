import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = (request as any).rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body not available. Ensure rawBody is set to true in main.ts'
      );
    }

    try {
      const event = await this.stripeService.constructEventFromPayload(
        signature,
        rawBody as Buffer
      );

      this.logger.log(`Received Stripe event: ${event.type}`);

      // Handle specific events here
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          this.logger.log(
            `PaymentIntent succeeded: ${paymentIntent.id} for amount ${paymentIntent.amount}`
          );
          // TODO: Call a service to update order status
          break;
        }
        default:
          this.logger.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      this.logger.error(`Webhook Error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
