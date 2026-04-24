import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ExternalPricingService } from "./pricing.service";

/**
 * Nombre de cartes rafraîchies chaque nuit. Aligné sur le top populaire pour
 * concentrer le quota TCGdex sur le hot path ; le long tail est couvert par le
 * lazy refresh dans `ExternalPricingService.getOrRefresh`.
 */
const TOP_CARDS_LIMIT = 500;

@Injectable()
export class ExternalPricingScheduler {
  private readonly logger = new Logger(ExternalPricingScheduler.name);

  constructor(
    private readonly externalPricingService: ExternalPricingService,
  ) {}

  /**
   * Exécution quotidienne à 04h00 Paris — après l'agrégation des métriques de
   * popularité (03h00) pour profiter du classement le plus récent.
   */
  @Cron("0 4 * * *", {
    name: "refresh-top-pricing",
    timeZone: "Europe/Paris",
  })
  async handleNightlyRefresh(): Promise<void> {
    this.logger.log(
      `Refresh pricing nightly : top ${TOP_CARDS_LIMIT} cartes populaires`,
    );
    const startedAt = Date.now();

    try {
      const stats = await this.externalPricingService.refreshTopPopular(
        TOP_CARDS_LIMIT,
      );
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `Refresh terminé en ${durationMs}ms — ${stats.refreshed} ok, ${stats.failed} erreurs, ${stats.skipped} sans tcgDexId`,
      );
    } catch (err) {
      if (err instanceof Error) {
        this.logger.error(`Refresh nightly en échec : ${err.message}`, err.stack);
      }
    }
  }

  /**
   * Déclenchement manuel — exposé pour un bouton admin ou un test d'intégration.
   */
  async triggerRefresh(limit = TOP_CARDS_LIMIT) {
    return this.externalPricingService.refreshTopPopular(limit);
  }
}
