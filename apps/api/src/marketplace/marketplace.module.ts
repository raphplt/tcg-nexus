import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { Player } from "src/player/entities/player.entity";
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
} from "./entities";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceService } from "./marketplace.service";
import { PaymentController } from "./payment.controller";
import { StripeService } from "./stripe.service";
import { WebhookController } from "./webhook.controller";

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
      Player,
      Card,
      User,
    ]),
    ConfigModule,
    UserCartModule,
  ],
  controllers: [
    MarketplaceController,
    CardPopularityController,
    PaymentController,
    WebhookController,
  ],
  providers: [
    MarketplaceService,
    CardPopularityService,
    CardPopularityScheduler,
    StripeService,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
