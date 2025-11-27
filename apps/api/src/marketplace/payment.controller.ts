import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly stripeService: StripeService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('create-payment-intent')
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto
  ) {
    const { amount, currency, metadata } = createPaymentIntentDto;
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      currency,
      metadata
    );
    return {
      clientSecret: paymentIntent.client_secret
    };
  }
}
