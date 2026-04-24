import { Injectable } from "@nestjs/common";
import { CardPricingData } from "src/card/entities/card.entity";

type CacheEntry = {
  value: CardPricingData;
  expiresAt: number;
};

/**
 * Cache mémoire minimal pour les prix de référence — un `Map` par cardId avec
 * TTL, suffisant pour un déploiement mono-instance. Si l'app passe multi-node,
 * remplacer par Redis / @nestjs/cache-manager sans changer l'interface.
 */
@Injectable()
export class PricingCache {
  private readonly store = new Map<string, CacheEntry>();
  // TTL par défaut aligné sur la fréquence de rafraîchissement CardMarket (24h).
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000;

  get(cardId: string): CardPricingData | null {
    const entry = this.store.get(cardId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(cardId);
      return null;
    }
    return entry.value;
  }

  set(cardId: string, value: CardPricingData, ttlMs = this.defaultTtlMs): void {
    this.store.set(cardId, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(cardId: string): void {
    this.store.delete(cardId);
  }

  size(): number {
    return this.store.size;
  }
}
