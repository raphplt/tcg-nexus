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
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';

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
      PokemonCard
    ])
  ],
  controllers: [
    MarketplaceController,
    ListingsController,
    CardPopularityController
  ],
  providers: [
    MarketplaceService,
    CardPopularityService,
    CardPopularityScheduler
  ]
})
export class MarketplaceModule {}
