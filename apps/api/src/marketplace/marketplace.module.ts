import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceService } from './marketplace.service';
import { CardPopularityService } from './card-popularity.service';
import { CardPopularityScheduler } from './card-popularity.scheduler';
import { MarketplaceController } from './marketplace.controller';
import { ListingsController } from './listings.controller';
import { CardPopularityController } from './card-popularity.controller';
import {
  Listing,
  Order,
  OrderItem,
  PaymentTransaction,
  PriceHistory,
  CardEvent,
  CardPopularityMetrics
} from './entities';
import { Player } from 'src/player/entities/player.entity';
import { Card } from 'src/card/entities/card.entity';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { UserCartModule } from '../user_cart/user_cart.module';

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
      Card
    ]),
    ConfigModule,
    UserCartModule
  ],
  controllers: [
    MarketplaceController,
    ListingsController,
    CardPopularityController,
    PaymentController,
    WebhookController
  ],
  providers: [
    MarketplaceService,
    CardPopularityService,
    CardPopularityScheduler,
    StripeService
  ],
  exports: [MarketplaceService]
})
export class MarketplaceModule {}
