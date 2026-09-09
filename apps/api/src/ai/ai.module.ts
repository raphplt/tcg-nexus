import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { Deck } from "../deck/entities/deck.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { DeckModule } from "../deck/deck.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { AiEngineModule } from "./engine/ai-engine.module";
import { DeckSimilarityService } from "./similarity/deck-similarity.service";

/**
 * Deck intelligence module: deterministic analysis plus local deck similarity.
 *
 * `DeckModule` is imported for deck loading and visibility rules rather than
 * re-implemented here, so a private deck stays private on every route.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Card, Deck, DeckFormat]),
    AiEngineModule,
    DeckModule,
  ],
  controllers: [AiController],
  providers: [AiService, DeckSimilarityService],
  exports: [AiService],
})
export class AiModule {}
