import { Module } from '@nestjs/common';
import { DeckCardService } from './deck-card.service';
import { DeckCardController } from './deck-card.controller';

@Module({
  controllers: [DeckCardController],
  providers: [DeckCardService]
})
export class DeckCardModule {}
