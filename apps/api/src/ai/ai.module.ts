import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Deck } from '../deck/entities/deck.entity';
import { Card } from '../card/entities/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deck, Card])],
  controllers: [AiController],
  providers: [AiService]
})
export class AiModule {}
