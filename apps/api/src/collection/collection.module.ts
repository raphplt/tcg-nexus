import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from '../collection-item/entities/collection-item.entity';
import { Card } from '../card/entities/card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, CollectionItem, Card])
  ],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService]
})
export class CollectionModule {}
