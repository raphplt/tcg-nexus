import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionItem } from '../collection-item/entities/collection-item.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, CollectionItem, PokemonCard])],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService]
})
export class CollectionModule {}
