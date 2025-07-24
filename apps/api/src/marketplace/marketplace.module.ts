import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { Listing, Order, OrderItem, PaymentTransaction } from './entities';
import { Player } from 'src/player/entities/player.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      Order,
      OrderItem,
      PaymentTransaction,
      Player,
      PokemonCard
    ])
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService]
})
export class MarketplaceModule {}
