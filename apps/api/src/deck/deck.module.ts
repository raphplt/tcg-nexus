import { Module } from '@nestjs/common';
import { DeckService } from './deck.service';
import { DeckController } from './deck.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deck } from './entities/deck.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { User } from '../user/entities/user.entity';
import {DeckCard} from "../deck-card/entities/deck-card.entity";
import {PokemonCard} from "../pokemon-card/entities/pokemon-card.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deck,
      DeckCard,
      DeckFormat,
      PokemonCard,
      User
    ])
  ],
  controllers: [DeckController],
  providers: [DeckService],
})
export class DeckModule {}
