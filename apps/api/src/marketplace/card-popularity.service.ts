import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { Card } from "src/card/entities/card.entity";
import { LessThanOrEqual, Repository } from "typeorm";
import { CreateCardEventDto } from "./dto/card-popularity.dto";
import { CardEvent, CardEventType } from "./entities/card-event.entity";
import { CardPopularityMetrics } from "./entities/card-popularity-metrics.entity";
import { Listing } from "./entities/listing.entity";

@Injectable()
export class CardPopularityService {
  private readonly logger = new Logger(CardPopularityService.name);

  // Poids pour le calcul du popularity_score
  private readonly EVENT_WEIGHTS = {
    [CardEventType.VIEW]: 1,
    [CardEventType.SEARCH]: 2,
    [CardEventType.FAVORITE]: 5,
    [CardEventType.ADD_TO_CART]: 10,
    [CardEventType.SALE]: 50,
  };

  // Fenêtres de temps (en jours)
  private readonly POPULARITY_WINDOW_DAYS = parseInt(
    process.env.POPULARITY_WINDOW_DAYS || "90",
    10,
  );
  private readonly TREND_SHORT_WINDOW_DAYS = parseInt(
    process.env.TREND_SHORT_WINDOW_DAYS || "7",
    10,
  );
  private readonly TREND_BASE_WINDOW_DAYS = parseInt(
    process.env.TREND_BASE_WINDOW_DAYS || "30",
    10,
  );

  constructor(
    @InjectRepository(CardEvent)
    private readonly cardEventRepository: Repository<CardEvent>,
    @InjectRepository(CardPopularityMetrics)
    private readonly metricsRepository: Repository<CardPopularityMetrics>,
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  /**
   * Records a user interaction event for a card.
   *
   * @param dto Card event creation DTO.
   * @param userId Optional user ID.
   * @param ipAddress Client IP address.
   * @param userAgent User agent header string.
   * @param sessionId Session identifier.
   */
  async recordEvent(
    dto: CreateCardEventDto,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ): Promise<void> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id: dto.cardId },
    });

    if (!card) {
      throw new BadRequestException("Card not found");
    }

    // Hash IP address for GDPR compliance
    const hashedIp = ipAddress
      ? createHash("sha256").update(ipAddress).digest("hex").substring(0, 16)
      : undefined;

    const event = this.cardEventRepository.create({
      card: { id: dto.cardId },
      eventType: dto.eventType,
      user: userId ? { id: userId } : undefined,
      sessionId: sessionId || dto.sessionId,
      ipAddress: hashedIp,
      userAgent,
      context: dto.context,
    });

    await this.cardEventRepository.save(event);
  }

  /**
   * Aggregates daily card events into summary metrics records.
   *
   * @param targetDate Target date for metric aggregation.
   */
  async aggregateDailyMetrics(targetDate?: Date): Promise<void> {
    const date = targetDate || new Date();
    date.setHours(0, 0, 0, 0);
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(
      `Aggregating metrics for ${date.toISOString().split("T")[0]}`,
    );

    // Retrieve all cards with recorded events for the target day
    const cardsWithEvents = await this.cardEventRepository
      .createQueryBuilder("event")
      .select("DISTINCT event.card.id", "cardId")
      .where("event.createdAt BETWEEN :start AND :end", {
        start: startOfDay,
        end: endOfDay,
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
   * Aggregates metrics for a single card over a specified time interval.
   */
  private async aggregateMetricsForCard(
    cardId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id: cardId },
    });

    if (!card) return;

    // Count events grouped by type
    const events = await this.cardEventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "type")
      .addSelect("COUNT(*)", "count")
      .where("event.card.id = :cardId", { cardId })
      .andWhere("event.createdAt BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .groupBy("event.eventType")
      .getRawMany<{ type: CardEventType; count: string }>();

    const metrics = {
      views: 0,
      searches: 0,
      favorites: 0,
      addsToCart: 0,
      sales: 0,
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

    // Use SQL aggregates instead of loading all listings into memory
    const listingStats = await this.listingRepository
      .createQueryBuilder("listing")
      .select("COUNT(listing.id)", "listingCount")
      .addSelect("MIN(listing.price)", "minPrice")
      .addSelect("AVG(listing.price)", "avgPrice")
      .where("listing.pokemonCard.id = :cardId", { cardId })
      .andWhere("(listing.expiresAt IS NULL OR listing.expiresAt > :endDate)", {
        endDate,
      })
      .andWhere("listing.quantityAvailable > 0")
      .getRawOne();

    const listingCount = parseInt(listingStats?.listingCount, 10) || 0;
    const minPrice = listingStats?.minPrice
      ? parseFloat(listingStats.minPrice)
      : null;
    const avgPrice = listingStats?.avgPrice
      ? parseFloat(listingStats.avgPrice)
      : null;

    // Calculate popularity and trend scores
    const popularityScore = await this.calculatePopularityScore(cardId);
    const trendScore = await this.calculateTrendScore(cardId);

    // Upsert daily metrics record
    const dateOnly = new Date(startDate);
    dateOnly.setHours(0, 0, 0, 0);

    let dailyMetrics = await this.metricsRepository.findOne({
      where: {
        card: { id: cardId },
        date: dateOnly,
      },
    });

    if (!dailyMetrics) {
      dailyMetrics = this.metricsRepository.create({
        card: { id: cardId },
        date: dateOnly,
      });
    }

    Object.assign(dailyMetrics, {
      ...metrics,
      listingCount,
      minPrice,
      avgPrice,
      popularityScore,
      trendScore,
      updatedAt: new Date(),
    });

    await this.metricsRepository.save(dailyMetrics);
  }

  /**
   * Calculates overall popularity score using SQL event aggregation.
   */
  private async calculatePopularityScore(cardId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.POPULARITY_WINDOW_DAYS);

    const result = await this.cardEventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "eventType")
      .addSelect("COUNT(*)", "count")
      .where("event.card.id = :cardId", { cardId })
      .andWhere("event.createdAt >= :cutoff", { cutoff: cutoffDate })
      .groupBy("event.eventType")
      .getRawMany<{ eventType: CardEventType; count: string }>();

    let score = 0;
    result.forEach(({ eventType, count }) => {
      const weight = this.EVENT_WEIGHTS[eventType] || 0;
      score += weight * parseInt(count, 10);
    });

    return score;
  }

  /**
   * Calculates trend growth score using SQL event aggregation.
   */
  private async calculateTrendScore(cardId: string): Promise<number> {
    const now = new Date();
    const shortWindowStart = new Date(now);
    shortWindowStart.setDate(
      shortWindowStart.getDate() - this.TREND_SHORT_WINDOW_DAYS,
    );
    const baseWindowStart = new Date(now);
    baseWindowStart.setDate(
      baseWindowStart.getDate() - this.TREND_BASE_WINDOW_DAYS,
    );

    // Single query with CASE to split recent vs base window
    const results = await this.cardEventRepository
      .createQueryBuilder("event")
      .select("event.eventType", "eventType")
      .addSelect(
        `CASE WHEN event.createdAt >= :shortStart THEN 'recent' ELSE 'base' END`,
        "window",
      )
      .addSelect("COUNT(*)", "count")
      .where("event.card.id = :cardId", { cardId })
      .andWhere("event.createdAt >= :baseStart", {
        baseStart: baseWindowStart,
      })
      .setParameter("shortStart", shortWindowStart)
      .groupBy("event.eventType")
      .addGroupBy(
        `CASE WHEN event.createdAt >= :shortStart THEN 'recent' ELSE 'base' END`,
      )
      .getRawMany<{
        eventType: CardEventType;
        window: string;
        count: string;
      }>();

    let recentScore = 0;
    let baseScore = 0;
    results.forEach(({ eventType, window, count }) => {
      const weight = this.EVENT_WEIGHTS[eventType] || 0;
      const total = weight * parseInt(count, 10);
      if (window === "recent") recentScore += total;
      else baseScore += total;
    });

    const recentDailyAvg = recentScore / this.TREND_SHORT_WINDOW_DAYS;
    const baseDailyAvg =
      baseScore / (this.TREND_BASE_WINDOW_DAYS - this.TREND_SHORT_WINDOW_DAYS);

    if (baseDailyAvg === 0) {
      return recentDailyAvg > 0 ? 100 : 0;
    }

    const growthRatio = ((recentDailyAvg - baseDailyAvg) / baseDailyAvg) * 100;

    const listingCount = await this.listingRepository.count({
      where: { pokemonCard: { id: cardId } },
    });

    const listingPenalty =
      listingCount > 100 ? Math.min(0.5, 100 / listingCount) : 1;

    return growthRatio * listingPenalty;
  }

  /**
   * Retrieves popular cards ordered by popularity score.
   *
   * @param limit Number of popular cards to retrieve.
   * @returns Array of popular cards with market summary stats.
   */
  async getPopularCards(limit: number = 10) {
    const metrics = await this.metricsRepository.find({
      where: {
        date: LessThanOrEqual(new Date()),
      },
      relations: ["card", "card.set", "card.set.serie"],
      order: {
        popularityScore: "DESC",
      },
      take: limit * 2,
    });

    // Group by card retaining latest date metric
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
        localId: metric.card.localId,
        rarity: metric.card.rarity,
        set: metric.card.set
          ? {
              name: metric.card.set.name,
              logo: metric.card.set.logo,
              symbol: metric.card.set.symbol,
              serie: metric.card.set.serie
                ? { name: metric.card.set.serie.name }
                : null,
            }
          : null,
      },
      popularityScore: parseFloat(metric.popularityScore.toString()),
      listingCount: metric.listingCount,
      minPrice: metric.minPrice ? parseFloat(metric.minPrice.toString()) : null,
      avgPrice: metric.avgPrice ? parseFloat(metric.avgPrice.toString()) : null,
    }));
  }

  /**
   * Retrieves trending cards ordered by trend growth score.
   *
   * @param limit Number of trending cards to return.
   * @param excludePopular Whether to filter out top popular cards to avoid duplicates.
   * @returns Array of trending cards.
   */
  async getTrendingCards(limit: number = 10, excludePopular: boolean = false) {
    const query = this.metricsRepository
      .createQueryBuilder("metric")
      .leftJoinAndSelect("metric.card", "card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("set.serie", "serie")
      .where("metric.date <= :now", { now: new Date() })
      .orderBy("metric.trendScore", "DESC")
      .take(limit * 2);

    const metrics = await query.getMany();

    // Group by card retaining latest date metric
    const cardMap = new Map<string, CardPopularityMetrics>();

    metrics.forEach((metric) => {
      const cardId = metric.card.id;
      const existing = cardMap.get(cardId);

      if (!existing || metric.date > existing.date) {
        cardMap.set(cardId, metric);
      }
    });

    let sortedCards = Array.from(cardMap.values()).sort(
      (a, b) => b.trendScore - a.trendScore,
    );

    // Exclude top popular cards to prevent duplication across widgets
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
        localId: metric.card.localId,
        rarity: metric.card.rarity,
        set: metric.card.set
          ? {
              name: metric.card.set.name,
              logo: metric.card.set.logo,
              symbol: metric.card.set.symbol,
              serie: metric.card.set.serie
                ? { name: metric.card.set.serie.name }
                : null,
            }
          : null,
      },
      trendScore: parseFloat(metric.trendScore.toString()),
      listingCount: metric.listingCount,
      minPrice: metric.minPrice ? parseFloat(metric.minPrice.toString()) : null,
    }));
  }
}
