import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import TCGdex from "@tcgdex/sdk";
import { Card, CardPricingData } from "src/card/entities/card.entity";
import { Currency } from "src/common/enums/currency";
import { PriceSource } from "src/common/enums/price-source";
import { In, Repository } from "typeorm";
import { CardPopularityService } from "../card-popularity.service";
import { PriceHistory } from "../entities/price-history.entity";
import {
  getCardMarketPrice,
  getTcgPlayerPrice,
} from "./price-reference.util";
import { PricingCache } from "./pricing.cache";

/**
 * Considère un snapshot comme périmé au-delà de 48h. Permet un refresh lazy
 * sans sur-solliciter TCGdex tout en gardant les prix « vivants ».
 */
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Budget d'attente pour un refresh synchrone déclenché lors d'une consultation
 * utilisateur. Au-delà, on retombe sur le pricing existant pour ne pas dégrader
 * l'UX — le refresh nightly finira le travail.
 */
const LAZY_REFRESH_TIMEOUT_MS = 3000;

/**
 * Orchestration du rafraîchissement des prix externes CardMarket/TCGPlayer.
 * Deux chemins :
 *  - scheduled (nightly cron) via `refreshTopCards`
 *  - lazy (à la consultation) via `getOrRefresh`
 *
 * Dans les deux cas, le résultat est caché en mémoire (TTL 24h) et une entrée
 * est appendée à `PriceHistory` pour conserver la trajectoire.
 */
@Injectable()
export class ExternalPricingService {
  private readonly logger = new Logger(ExternalPricingService.name);
  private readonly tcgdex = new TCGdex("en");

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    private readonly cache: PricingCache,
    private readonly cardPopularityService: CardPopularityService,
  ) {}

  /**
   * Vérifie si le pricing stocké est assez vieux pour mériter un refresh.
   * Retourne `true` si aucune source n'a de timestamp récent.
   */
  isStale(pricing: CardPricingData | null | undefined): boolean {
    if (!pricing) return true;
    const mostRecent = this.mostRecentUpdate(pricing);
    if (mostRecent == null) return true;
    return Date.now() - mostRecent > STALE_AFTER_MS;
  }

  /**
   * Chemin appelé depuis `MarketplaceService.getCardStatistics`. Renvoie le
   * pricing frais si possible, sinon l'existant en fallback.
   */
  async getOrRefresh(cardId: string): Promise<CardPricingData | null> {
    const cached = this.cache.get(cardId);
    if (cached) return cached;

    const card = await this.cardRepository.findOne({ where: { id: cardId } });
    if (!card) return null;

    if (!this.isStale(card.pricing)) {
      if (card.pricing) this.cache.set(cardId, card.pricing);
      return card.pricing ?? null;
    }

    const refreshed = await this.safeRefresh(card, LAZY_REFRESH_TIMEOUT_MS);
    return refreshed ?? card.pricing ?? null;
  }

  /**
   * Rafraîchit le pricing d'une seule carte depuis TCGdex et persiste
   * l'historique. Lève si la carte n'a pas de `tcgDexId` ou si l'API échoue.
   */
  async refreshCardPricing(card: Card): Promise<CardPricingData | null> {
    if (!card.tcgDexId) return null;

    const remote = (await this.tcgdex.fetch("cards", card.tcgDexId)) as {
      pricing?: CardPricingData | null;
    } | null;

    const pricing = remote?.pricing ?? null;
    if (!pricing) return null;

    await this.cardRepository.update({ id: card.id }, { pricing });
    this.cache.set(card.id, pricing);
    await this.appendHistory(card, pricing);
    return pricing;
  }

  /**
   * Rafraîchit les N cartes les plus populaires. Utilisé par le scheduler
   * nightly pour garder le hot path toujours tiède.
   */
  async refreshTopPopular(limit: number): Promise<{
    refreshed: number;
    failed: number;
    skipped: number;
  }> {
    const popular = await this.cardPopularityService.getPopularCards(limit);
    const cardIds = popular.map((p) => p.card.id);
    if (cardIds.length === 0) return { refreshed: 0, failed: 0, skipped: 0 };

    const cards = await this.cardRepository.find({ where: { id: In(cardIds) } });
    const refreshable = cards.filter((c) => c.tcgDexId);
    const result = await this.refreshCards(refreshable);
    return {
      ...result,
      skipped: cards.length - refreshable.length,
    };
  }

  /**
   * Boucle séquentielle. Throttle léger entre appels pour rester poli envers
   * TCGdex. Un échec sur une carte ne stoppe pas le lot.
   */
  async refreshCards(cards: Card[], throttleMs = 200): Promise<{
    refreshed: number;
    failed: number;
  }> {
    let refreshed = 0;
    let failed = 0;
    for (const card of cards) {
      try {
        const pricing = await this.refreshCardPricing(card);
        if (pricing) refreshed++;
      } catch (err) {
        failed++;
        this.logger.warn(
          `Refresh pricing failed for card ${card.id} (${card.tcgDexId}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      if (throttleMs > 0) await this.sleep(throttleMs);
    }
    return { refreshed, failed };
  }

  private async safeRefresh(
    card: Card,
    timeoutMs: number,
  ): Promise<CardPricingData | null> {
    try {
      return await this.withTimeout(this.refreshCardPricing(card), timeoutMs);
    } catch (err) {
      this.logger.warn(
        `Lazy refresh abandonné pour ${card.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  private async appendHistory(
    card: Card,
    pricing: CardPricingData,
  ): Promise<void> {
    const rows: PriceHistory[] = [];
    const recordedAt = new Date();

    const cmPrice = getCardMarketPrice(pricing.cardmarket);
    if (cmPrice != null) {
      rows.push(
        this.priceHistoryRepository.create({
          pokemonCard: card,
          price: cmPrice,
          currency: Currency.EUR,
          source: PriceSource.CARDMARKET,
          quantityAvailable: 1,
          recordedAt,
        }),
      );
    }

    const tcgPrice = getTcgPlayerPrice(pricing.tcgplayer);
    if (tcgPrice != null) {
      rows.push(
        this.priceHistoryRepository.create({
          pokemonCard: card,
          price: tcgPrice,
          currency: Currency.USD,
          source: PriceSource.TCGPLAYER,
          quantityAvailable: 1,
          recordedAt,
        }),
      );
    }

    if (rows.length > 0) await this.priceHistoryRepository.save(rows);
  }

  private mostRecentUpdate(pricing: CardPricingData): number | null {
    const times: number[] = [];
    const cm = pricing.cardmarket?.updated;
    const tcg = pricing.tcgplayer?.updated;
    if (cm) times.push(Date.parse(cm));
    if (tcg) times.push(Date.parse(tcg));
    const valid = times.filter((t) => !Number.isNaN(t));
    return valid.length ? Math.max(...valid) : null;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
