import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { User } from "src/user/entities/user.entity";
import { UserCartService } from "../user_cart/user_cart.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly userCartService: UserCartService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("create-payment-intent")
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @CurrentUser() user: User,
  ) {
    // Recalculate amount server-side from the user's cart
    const cart = await this.userCartService.findCartByUserId(user.id);
    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    let serverAmount = 0;
    for (const item of cart.cartItems) {
      serverAmount += Number(item.listing.price) * item.quantity;
    }

    // Determine currency from cart items (all items must share the same currency)
    const currencies = [
      ...new Set(cart.cartItems.map((item) => item.listing.currency)),
    ];
    if (currencies.length > 1) {
      throw new BadRequestException(
        "All items in cart must use the same currency",
      );
    }
    const currency = currencies[0];

    const paymentIntent = await this.stripeService.createPaymentIntent(
      serverAmount,
      currency,
      {
        userId: String(user.id),
        ...(createPaymentIntentDto.metadata || {}),
      },
    );
    return {
      clientSecret: paymentIntent.client_secret,
      amount: serverAmount,
      currency,
    };
  }
}
