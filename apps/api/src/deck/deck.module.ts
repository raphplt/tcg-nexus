import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeckService } from './deck.service';
import { DeckController } from './deck.controller';
import { Deck } from './entities/deck.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';
import { DeckCardService } from 'src/deck-card/deck-card.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, DeckCard, PokemonCard, DeckFormat])],
  controllers: [DeckController],
  providers: [DeckService, DeckCardService]
})
export class DeckModule {}
