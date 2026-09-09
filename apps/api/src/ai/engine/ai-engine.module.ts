import { Module } from "@nestjs/common";
import { CatalogLocalizationModule } from "../../translation/catalog-localization.module";
import { DeckLegalityModule } from "../../tournament/deck-legality.module";
import { DeckMetricsService } from "./deck-metrics.service";

/**
 * Deterministic deck analysis engine.
 *
 * Exposed as its own module so both `DeckModule` (the historical
 * `POST /deck/:id/analyze` route) and `AiModule` run the exact same rules.
 */
@Module({
  imports: [CatalogLocalizationModule, DeckLegalityModule],
  providers: [DeckMetricsService],
  exports: [DeckMetricsService],
})
export class AiEngineModule {}
