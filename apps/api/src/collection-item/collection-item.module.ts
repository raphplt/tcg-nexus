import { Module } from '@nestjs/common';
import { CollectionItemService } from './collection-item.service';
import { CollectionItemController } from './collection-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionItem } from './entities/collection-item.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { Collection } from 'src/collection/entities/collection.entity';
import { CardState } from 'src/card-state/entities/card-state.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectionItem,
      PokemonCard,
      Collection,
      CardState,
      User
    ])
  ],
  controllers: [CollectionItemController],
  providers: [CollectionItemService]
})
export class CollectionItemModule {}
