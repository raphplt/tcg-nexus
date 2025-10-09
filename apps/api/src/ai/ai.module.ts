import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Deck } from '../deck/entities/deck.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, PokemonCard])],
  controllers: [AiController],
  providers: [AiService]
})
export class AiModule {}
