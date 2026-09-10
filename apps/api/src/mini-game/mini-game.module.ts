import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { Card } from "../card/entities/card.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { CatalogLocalizationModule } from "../translation/catalog-localization.module";
import { User } from "../user/entities/user.entity";
import { MiniGameController } from "./mini-game.controller";
import { MiniGameGateway } from "./mini-game.gateway";
import { MiniGameItemsService } from "./mini-game-items.service";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    CatalogLocalizationModule,
    TypeOrmModule.forFeature([Card, SealedProduct, Listing, User]),
  ],
  controllers: [MiniGameController],
  providers: [MiniGameGateway, MiniGameItemsService],
  exports: [MiniGameGateway, MiniGameItemsService],
})
export class MiniGameModule {}
