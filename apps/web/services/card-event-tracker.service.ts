import { api } from "@/utils/fetch";

export enum CardEventType {
  VIEW = "view",
  SEARCH = "search",
  FAVORITE = "favorite",
  ADD_TO_CART = "add_to_cart",
  SALE = "sale",
}

export interface CardEventContext {
  searchQuery?: string;
  referrer?: string;
  listingId?: number;
  [key: string]: any;
}

class CardEventTracker {
  private sessionId: string;
  private viewCache: Set<string> = new Set();
  private viewTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Records a card event.
   */
  private async recordEvent(
    cardId: string,
    eventType: CardEventType,
    context?: CardEventContext,
  ): Promise<void> {
    try {
      await api.post("/marketplace/events", {
        cardId,
        eventType,
        sessionId: this.sessionId,
        context,
      });
    } catch (error) {
      console.debug("Failed to record card event:", error);
    }
  }

  /**
   * Tracks a card view with session-level deduplication.
   */
  async trackView(cardId: string, context?: CardEventContext): Promise<void> {
    const cacheKey = `view-${cardId}`;

    if (this.viewCache.has(cacheKey)) {
      return;
    }

    this.viewCache.add(cacheKey);

    if (this.viewTimeout) {
      clearTimeout(this.viewTimeout);
    }
    this.viewTimeout = setTimeout(
      () => {
        this.viewCache.clear();
      },
      24 * 60 * 60 * 1000,
    );

    await this.recordEvent(cardId, CardEventType.VIEW, context);
  }

  /**
   * Tracks a search.
   */
  async trackSearch(
    cardId: string,
    searchQuery: string,
    context?: CardEventContext,
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.SEARCH, {
      ...context,
      searchQuery,
    });
  }

  /**
   * Tracks adding a card to favorites.
   */
  async trackFavorite(
    cardId: string,
    context?: CardEventContext,
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.FAVORITE, context);
  }

  /**
   * Tracks adding a card to the cart.
   */
  async trackAddToCart(
    cardId: string,
    listingId?: number,
    context?: CardEventContext,
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.ADD_TO_CART, {
      ...context,
      listingId,
    });
  }

  /**
   * Tracks a sale when an order is created by the backend.
   */
  async trackSale(cardId: string, context?: CardEventContext): Promise<void> {
    await this.recordEvent(cardId, CardEventType.SALE, context);
  }
}

// Singleton instance
export const cardEventTracker = new CardEventTracker();
