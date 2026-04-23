import { api } from "@/utils/fetch";

export enum SealedEventType {
  VIEW = "view",
  SEARCH = "search",
  FAVORITE = "favorite",
  ADD_TO_CART = "add_to_cart",
  SALE = "sale",
}

export interface SealedEventContext {
  searchQuery?: string;
  referrer?: string;
  listingId?: number;
  [key: string]: any;
}

class SealedEventTracker {
  private sessionId: string;
  private viewCache: Set<string> = new Set();
  private viewTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private async recordEvent(
    sealedProductId: string,
    eventType: SealedEventType,
    context?: SealedEventContext,
  ): Promise<void> {
    try {
      await api.post("/marketplace/sealed-events", {
        sealedProductId,
        eventType,
        sessionId: this.sessionId,
        context,
      });
    } catch (error) {
      // Échec silencieux pour ne pas perturber l'UX
      console.debug("Failed to record sealed event:", error);
    }
  }

  /**
   * Track une vue de produit scellé (avec déduplication par session)
   */
  async trackView(
    sealedProductId: string,
    context?: SealedEventContext,
  ): Promise<void> {
    const cacheKey = `view-${sealedProductId}`;

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

    await this.recordEvent(sealedProductId, SealedEventType.VIEW, context);
  }

  async trackSearch(
    sealedProductId: string,
    searchQuery: string,
    context?: SealedEventContext,
  ): Promise<void> {
    await this.recordEvent(sealedProductId, SealedEventType.SEARCH, {
      ...context,
      searchQuery,
    });
  }

  async trackFavorite(
    sealedProductId: string,
    context?: SealedEventContext,
  ): Promise<void> {
    await this.recordEvent(sealedProductId, SealedEventType.FAVORITE, context);
  }

  async trackAddToCart(
    sealedProductId: string,
    listingId?: number,
    context?: SealedEventContext,
  ): Promise<void> {
    await this.recordEvent(sealedProductId, SealedEventType.ADD_TO_CART, {
      ...context,
      listingId,
    });
  }
}

export const sealedEventTracker = new SealedEventTracker();
