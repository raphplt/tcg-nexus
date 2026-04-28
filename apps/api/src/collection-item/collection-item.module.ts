import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "src/card/entities/card.entity";
import { CardState } from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import { CollectionItemController } from "./collection-item.controller";
import { CollectionItemService } from "./collection-item.service";
import { CollectionItem } from "./entities/collection-item.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionItem,
      Card,
      Collection,
      CardState,
      User,
      SealedProduct,
    ]),
  ],
  controllers: [CollectionItemController],
  providers: [CollectionItemService],
})
export class CollectionItemModule {}
