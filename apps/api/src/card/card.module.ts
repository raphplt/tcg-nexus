import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { PokemonCardDetails } from './entities/pokemon-card-details.entity';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PokemonSet } from '../pokemon-set/entities/pokemon-set.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Card, PokemonCardDetails, PokemonSet])],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService]
})
export class CardModule {}
