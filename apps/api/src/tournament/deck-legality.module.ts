import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { DeckFormat } from "../deck-format/entities/deck-format.entity";
import { DeckLegalityService } from "./services/deck-legality.service";

/**
 * Standalone provider for deck legality checks.
 *
 * Kept apart from `TournamentModule` so the deck analysis engine can reuse the
 * same rules without pulling in the whole tournament graph.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Card, DeckFormat])],
  providers: [DeckLegalityService],
  exports: [DeckLegalityService],
})
export class DeckLegalityModule {}
