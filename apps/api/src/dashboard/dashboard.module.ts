import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BadgeModule } from "src/badge/badge.module";
import { Collection } from "src/collection/entities/collection.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { Deck } from "src/deck/entities/deck.entity";
import { CardEvent } from "src/marketplace/entities/card-event.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { Order } from "src/marketplace/entities/order.entity";
import { OrderItem } from "src/marketplace/entities/order-item.entity";
import { Player } from "src/player/entities/player.entity";
import { Ranking } from "src/ranking/entities/ranking.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Collection,
      CollectionItem,
      Deck,
      Player,
      Ranking,
      Listing,
      Order,
      OrderItem,
      CardEvent,
    ]),
    BadgeModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
