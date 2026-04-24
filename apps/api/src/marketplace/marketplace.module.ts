import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { Player } from "src/player/entities/player.entity";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { UserCartModule } from "../user_cart/user_cart.module";
import { CardPopularityController } from "./card-popularity.controller";
import { CardPopularityScheduler } from "./card-popularity.scheduler";
import { CardPopularityService } from "./card-popularity.service";
import {
  CardEvent,
  CardPopularityMetrics,
  Listing,
  Order,
  OrderItem,
  PaymentTransaction,
  PriceHistory,
  SealedEvent,
  Review,
} from "./entities";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PaymentController } from "./payment.controller";
import {
  ExternalPricingScheduler,
  ExternalPricingService,
  PricingCache,
} from "./pricing";
import { SealedEventController } from "./sealed-event.controller";
import { SealedEventService } from "./sealed-event.service";
import { StripeService } from "./stripe.service";
import { WebhookController } from "./webhook.controller";

import { ListingLifecycleScheduler } from "./listing-lifecycle.scheduler";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      Order,
      OrderItem,
      PaymentTransaction,
      PriceHistory,
      CardEvent,
      CardPopularityMetrics,
      SealedEvent,
      Review,
      Player,
      Card,
      SealedProduct,
      User,
    ]),
    ConfigModule,
    UserCartModule,
  ],
  controllers: [
    MarketplaceController,
    CardPopularityController,
    SealedEventController,
    PaymentController,
    WebhookController,
  ],
  providers: [
    MarketplaceService,
    CardPopularityService,
    CardPopularityScheduler,
    SealedEventService,
    StripeService,
    PricingCache,
    ExternalPricingService,
    ExternalPricingScheduler,
    ListingLifecycleScheduler,
  ],
  exports: [MarketplaceService, SealedEventService, ExternalPricingService],
})
export class MarketplaceModule {}
