import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CardPopularityService } from './card-popularity.service';

@Injectable()
export class CardPopularityScheduler {
  private readonly logger = new Logger(CardPopularityScheduler.name);

  constructor(private readonly cardPopularityService: CardPopularityService) {}

  /**
   * Exécute l'agrégation quotidienne des métriques
   * Tous les jours à 3h du matin (heure creuse)
   */
  @Cron('0 3 * * *', {
    name: 'aggregate-daily-metrics',
    timeZone: 'Europe/Paris'
  })
  async handleDailyAggregation() {
    this.logger.log('Starting daily metrics aggregation...');
    const startTime = Date.now();

    try {
      // Agrégation pour le jour précédent
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await this.cardPopularityService.aggregateDailyMetrics(yesterday);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Daily metrics aggregation completed successfully in ${duration}ms`
      );
    } catch (error) {
      this.logger.error(
        `Error during daily metrics aggregation: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Permet de déclencher manuellement l'agrégation (pour tests ou récupération)
   */
  async triggerAggregation(targetDate?: Date) {
    this.logger.log('Manual aggregation triggered');
    await this.cardPopularityService.aggregateDailyMetrics(targetDate);
  }
}
