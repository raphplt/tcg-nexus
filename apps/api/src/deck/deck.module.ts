import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogLocalizationModule } from "src/translation/catalog-localization.module";
import { AiEngineModule } from "../ai/engine/ai-engine.module";
import { Card } from "../card/entities/card.entity";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { DeckCard } from "../deck-card/entities/deck-card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { Listing } from "../marketplace/entities/listing.entity";
import { User } from "../user/entities/user.entity";
import { DeckController } from "./deck.controller";
import { DeckService } from "./deck.service";
import { DeckInventoryService } from "./deck-inventory.service";
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
      CollectionItem,
      Listing,
    ]),
    CatalogLocalizationModule,
    AiEngineModule,
  ],
  controllers: [DeckController],
  providers: [DeckService, DeckInventoryService],
  exports: [DeckService, DeckInventoryService],
})
export class DeckModule {}
