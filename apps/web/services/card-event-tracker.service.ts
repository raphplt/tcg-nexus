import { api } from '@/utils/fetch';

export enum CardEventType {
  VIEW = 'view',
  SEARCH = 'search',
  FAVORITE = 'favorite',
  ADD_TO_CART = 'add_to_cart',
  SALE = 'sale'
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
    // Générer un sessionId unique pour cette session
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enregistre un événement de carte
   */
  private async recordEvent(
    cardId: string,
    eventType: CardEventType,
    context?: CardEventContext
  ): Promise<void> {
    try {
      await api.post('/marketplace/events', {
        cardId,
        eventType,
        sessionId: this.sessionId,
        context
      });
    } catch (error) {
      // Échec silencieux pour ne pas perturber l'UX
      console.debug('Failed to record card event:', error);
    }
  }

  /**
   * Track une vue de carte (avec déduplication par session)
   */
  async trackView(cardId: string, context?: CardEventContext): Promise<void> {
    const cacheKey = `view-${cardId}`;

    // Éviter les doublons dans la même session
    if (this.viewCache.has(cacheKey)) {
      return;
    }

    this.viewCache.add(cacheKey);

    // Réinitialiser le cache après 24h (simulation d'une nouvelle journée)
    if (this.viewTimeout) {
      clearTimeout(this.viewTimeout);
    }
    this.viewTimeout = setTimeout(() => {
      this.viewCache.clear();
    }, 24 * 60 * 60 * 1000);

    await this.recordEvent(cardId, CardEventType.VIEW, context);
  }

  /**
   * Track une recherche
   */
  async trackSearch(
    cardId: string,
    searchQuery: string,
    context?: CardEventContext
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.SEARCH, {
      ...context,
      searchQuery
    });
  }

  /**
   * Track l'ajout aux favoris
   */
  async trackFavorite(
    cardId: string,
    context?: CardEventContext
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.FAVORITE, context);
  }

  /**
   * Track l'ajout au panier
   */
  async trackAddToCart(
    cardId: string,
    listingId?: number,
    context?: CardEventContext
  ): Promise<void> {
    await this.recordEvent(cardId, CardEventType.ADD_TO_CART, {
      ...context,
      listingId
    });
  }

  /**
   * Track une vente (appelé côté backend lors de la création d'une commande)
   */
  async trackSale(cardId: string, context?: CardEventContext): Promise<void> {
    await this.recordEvent(cardId, CardEventType.SALE, context);
  }
}

// Singleton instance
export const cardEventTracker = new CardEventTracker();

