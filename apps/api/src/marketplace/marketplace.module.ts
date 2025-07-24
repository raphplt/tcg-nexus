import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { Listing, Order, OrderItem, PaymentTransaction } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, Order, OrderItem, PaymentTransaction])
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService]
})
export class MarketplaceModule {}
