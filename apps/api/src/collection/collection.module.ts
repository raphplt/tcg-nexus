import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";
import { Collection } from "./entities/collection.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Collection, CollectionItem, Card])],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
