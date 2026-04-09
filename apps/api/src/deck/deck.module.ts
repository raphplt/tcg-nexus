import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { User } from "../user/entities/user.entity";
import { DeckController } from "./deck.controller";
import { DeckService } from "./deck.service";
import { Deck } from "./entities/deck.entity";
import { DeckShare } from "./entities/deck-share.entity";
import { SavedDeck } from "./entities/saved-deck.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deck,
      DeckCard,
      DeckFormat,
      Card,
      User,
      DeckShare,
      SavedDeck,
    ]),
  ],
  controllers: [DeckController],
  providers: [DeckService],
})
export class DeckModule {}
