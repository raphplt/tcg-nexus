import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { CardEvent, CardEventType } from './entities/card-event.entity';
import { CardPopularityMetrics } from './entities/card-popularity-metrics.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { Listing } from './entities/listing.entity';
import { Order } from './entities/order.entity';
import { CreateCardEventDto } from './dto/card-popularity.dto';

@Injectable()
export class CardPopularityService {
  private readonly logger = new Logger(CardPopularityService.name);

  // Poids pour le calcul du popularity_score
  private readonly EVENT_WEIGHTS = {
    [CardEventType.VIEW]: 1,
    [CardEventType.SEARCH]: 2,
    [CardEventType.FAVORITE]: 5,
    [CardEventType.ADD_TO_CART]: 10,
    [CardEventType.SALE]: 50
  };

  // Fenêtres de temps (en jours)
  private readonly POPULARITY_WINDOW_DAYS = parseInt(
    process.env.POPULARITY_WINDOW_DAYS || '90',
    10
  );
  private readonly TREND_SHORT_WINDOW_DAYS = parseInt(
    process.env.TREND_SHORT_WINDOW_DAYS || '7',
    10
  );
  private readonly TREND_BASE_WINDOW_DAYS = parseInt(
    process.env.TREND_BASE_WINDOW_DAYS || '30',
    10
  );

  constructor(
    @InjectRepository(CardEvent)
    private readonly cardEventRepository: Repository<CardEvent>,
    @InjectRepository(CardPopularityMetrics)
    private readonly metricsRepository: Repository<CardPopularityMetrics>,
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepository: Repository<PokemonCard>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>
  ) {}

  /**
   * Enregistre un événement de carte
   */
  async recordEvent(
    dto: CreateCardEventDto,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id: dto.cardId }
    });

    if (!card) {
      throw new BadRequestException('Card not found');
    }

    const event = this.cardEventRepository.create({
      card: { id: dto.cardId },
      eventType: dto.eventType,
      user: userId ? { id: userId } : undefined,
      sessionId: sessionId || dto.sessionId,
      ipAddress,
      userAgent,
      context: dto.context
    });

    await this.cardEventRepository.save(event);
  }

  /**
   * Agrège les événements du jour précédent et calcule les métriques
   */
  async aggregateDailyMetrics(targetDate?: Date): Promise<void> {
    const date = targetDate || new Date();
    date.setHours(0, 0, 0, 0);
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(
      `Aggregating metrics for ${date.toISOString().split('T')[0]}`
    );

    // Récupérer toutes les cartes qui ont eu des événements ce jour-là
    const cardsWithEvents = await this.cardEventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.card.id', 'cardId')
      .where('event.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay
      })
      .getRawMany<{ cardId: string }>();

    let processedCount = 0;

    for (const { cardId } of cardsWithEvents) {
      await this.aggregateMetricsForCard(cardId, startOfDay, endOfDay);
      processedCount++;
    }

    this.logger.log(`Processed ${processedCount} cards`);
  }

  /**
   * Agrège les métriques pour une carte donnée sur une période
   */
  private async aggregateMetricsForCard(
    cardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id: cardId }
    });

    if (!card) return;

    // Compter les événements par type
    const events = await this.cardEventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.card.id = :cardId', { cardId })
      .andWhere('event.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate
      })
      .groupBy('event.eventType')
      .getRawMany<{ type: CardEventType; count: string }>();

    const metrics = {
      views: 0,
      searches: 0,
      favorites: 0,
      addsToCart: 0,
      sales: 0
    };

    events.forEach(({ type, count }) => {
      const countNum = parseInt(count, 10);
      switch (type) {
        case CardEventType.VIEW:
          metrics.views = countNum;
          break;
        case CardEventType.SEARCH:
          metrics.searches = countNum;
          break;
        case CardEventType.FAVORITE:
          metrics.favorites = countNum;
          break;
        case CardEventType.ADD_TO_CART:
          metrics.addsToCart = countNum;
          break;
        case CardEventType.SALE:
          metrics.sales = countNum;
          break;
      }
    });

    // Récupérer les métriques marketplace
    const listings = await this.listingRepository.find({
      where: { pokemonCard: { id: cardId } },
      relations: ['pokemonCard']
    });

    const activeListings = listings.filter(
      (l) => !l.expiresAt || new Date(l.expiresAt) > endDate
    );

    const prices = activeListings.map((l) => parseFloat(l.price.toString()));
    const listingCount = activeListings.length;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const avgPrice =
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : null;

    // Calculer les scores
    const popularityScore = await this.calculatePopularityScore(cardId);
    const trendScore = await this.calculateTrendScore(cardId);

    // Sauvegarder ou mettre à jour les métriques
    const dateOnly = new Date(startDate);
    dateOnly.setHours(0, 0, 0, 0);

    let dailyMetrics = await this.metricsRepository.findOne({
      where: {
        card: { id: cardId },
        date: dateOnly
      }
    });

    if (!dailyMetrics) {
      dailyMetrics = this.metricsRepository.create({
        card: { id: cardId },
        date: dateOnly
      });
    }

    Object.assign(dailyMetrics, {
      ...metrics,
      listingCount,
      minPrice,
      avgPrice,
      popularityScore,
      trendScore,
      updatedAt: new Date()
    });

    await this.metricsRepository.save(dailyMetrics);
  }

  /**
   * Calcule le popularity_score sur une fenêtre glissante (90 jours par défaut)
   */
  private async calculatePopularityScore(cardId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.POPULARITY_WINDOW_DAYS);

    const events = await this.cardEventRepository.find({
      where: {
        card: { id: cardId },
        createdAt: Between(cutoffDate, new Date())
      }
    });

    let score = 0;

    events.forEach((event) => {
      const weight = this.EVENT_WEIGHTS[event.eventType] || 0;
      score += weight;
    });

    return score;
  }

  /**
   * Calcule le trend_score en comparant la période récente vs période de base
   */
  private async calculateTrendScore(cardId: string): Promise<number> {
    const now = new Date();
    const shortWindowStart = new Date(now);
    shortWindowStart.setDate(
      shortWindowStart.getDate() - this.TREND_SHORT_WINDOW_DAYS
    );
    const baseWindowStart = new Date(now);
    baseWindowStart.setDate(
      baseWindowStart.getDate() - this.TREND_BASE_WINDOW_DAYS
    );

    // Événements récents (7 jours)
    const recentEvents = await this.cardEventRepository.find({
      where: {
        card: { id: cardId },
        createdAt: Between(shortWindowStart, now)
      }
    });

    // Événements de base (30 jours précédents les 7 derniers jours)
    const baseEvents = await this.cardEventRepository.find({
      where: {
        card: { id: cardId },
        createdAt: Between(baseWindowStart, shortWindowStart)
      }
    });

    let recentScore = 0;
    recentEvents.forEach((event) => {
      recentScore += this.EVENT_WEIGHTS[event.eventType] || 0;
    });

    let baseScore = 0;
    baseEvents.forEach((event) => {
      baseScore += this.EVENT_WEIGHTS[event.eventType] || 0;
    });

    // Normaliser par le nombre de jours
    const recentDailyAvg = recentScore / this.TREND_SHORT_WINDOW_DAYS;
    const baseDailyAvg =
      baseScore / (this.TREND_BASE_WINDOW_DAYS - this.TREND_SHORT_WINDOW_DAYS);

    // Calculer le ratio de croissance
    if (baseDailyAvg === 0) {
      return recentDailyAvg > 0 ? 100 : 0;
    }

    const growthRatio = ((recentDailyAvg - baseDailyAvg) / baseDailyAvg) * 100;

    // Pénaliser si trop de listings
    const listings = await this.listingRepository.count({
      where: { pokemonCard: { id: cardId } }
    });

    const listingPenalty = listings > 100 ? Math.min(0.5, 100 / listings) : 1;

    return growthRatio * listingPenalty;
  }

  /**
   * Récupère les cartes populaires
   */
  async getPopularCards(limit: number = 10) {
    const metrics = await this.metricsRepository.find({
      where: {
        date: LessThanOrEqual(new Date())
      },
      relations: ['card', 'card.set', 'card.set.serie'],
      order: {
        popularityScore: 'DESC'
      },
      take: limit * 2
    });

    // Grouper par carte et prendre le score le plus récent
    const cardMap = new Map<string, CardPopularityMetrics>();

    metrics.forEach((metric) => {
      const cardId = metric.card.id;
      const existing = cardMap.get(cardId);

      if (!existing || metric.date > existing.date) {
        cardMap.set(cardId, metric);
      }
    });

    const sortedCards = Array.from(cardMap.values())
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);

    return sortedCards.map((metric) => ({
      card: {
        id: metric.card.id,
        name: metric.card.name,
        image: metric.card.image,
        rarity: metric.card.rarity,
        set: metric.card.set
          ? {
              name: metric.card.set.name,
              logo: metric.card.set.logo,
              symbol: metric.card.set.symbol,
              serie: metric.card.set.serie
                ? { name: metric.card.set.serie.name }
                : null
            }
          : null
      },
      popularityScore: parseFloat(metric.popularityScore.toString()),
      listingCount: metric.listingCount,
      minPrice: metric.minPrice ? parseFloat(metric.minPrice.toString()) : null,
      avgPrice: metric.avgPrice ? parseFloat(metric.avgPrice.toString()) : null
    }));
  }

  /**
   * Récupère les cartes en tendance
   */
  async getTrendingCards(limit: number = 10, excludePopular: boolean = false) {
    const query = this.metricsRepository
      .createQueryBuilder('metric')
      .leftJoinAndSelect('metric.card', 'card')
      .leftJoinAndSelect('card.set', 'set')
      .leftJoinAndSelect('set.serie', 'serie')
      .where('metric.date <= :now', { now: new Date() })
      .orderBy('metric.trendScore', 'DESC')
      .take(limit * 2);

    const metrics = await query.getMany();

    // Grouper par carte et prendre le score le plus récent
    const cardMap = new Map<string, CardPopularityMetrics>();

    metrics.forEach((metric) => {
      const cardId = metric.card.id;
      const existing = cardMap.get(cardId);

      if (!existing || metric.date > existing.date) {
        cardMap.set(cardId, metric);
      }
    });

    let sortedCards = Array.from(cardMap.values()).sort(
      (a, b) => b.trendScore - a.trendScore
    );

    // Exclure les top populaires (pour ne pas avoir de doublons dans les résultats)
    if (excludePopular) {
      const popularCards = await this.getPopularCards(limit);
      const popularCardIds = new Set(popularCards.map((c) => c.card.id));
      sortedCards = sortedCards.filter((m) => !popularCardIds.has(m.card.id));
    }

    return sortedCards.slice(0, limit).map((metric) => ({
      card: {
        id: metric.card.id,
        name: metric.card.name,
        image: metric.card.image,
        rarity: metric.card.rarity,
        set: metric.card.set
          ? {
              name: metric.card.set.name,
              logo: metric.card.set.logo,
              symbol: metric.card.set.symbol,
              serie: metric.card.set.serie
                ? { name: metric.card.set.serie.name }
                : null
            }
          : null
      },
      trendScore: parseFloat(metric.trendScore.toString()),
      listingCount: metric.listingCount,
      minPrice: metric.minPrice ? parseFloat(metric.minPrice.toString()) : null
    }));
  }
}
