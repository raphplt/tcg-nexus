import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BadgeModule } from "../badge/badge.module";
import { Collection } from "../collection/entities/collection.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { Deck } from "../deck/entities/deck.entity";
import { CardEvent } from "../marketplace/entities/card-event.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { Order } from "../marketplace/entities/order.entity";
import { OrderItem } from "../marketplace/entities/order-item.entity";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
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
