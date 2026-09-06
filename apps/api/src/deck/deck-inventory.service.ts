import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { ListingStatus } from "src/common/enums/listing-status";
import { Deck } from "src/deck/entities/deck.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { User } from "src/user/entities/user.entity";
import { MoreThan, Repository } from "typeorm";
import {
  DeckCardOfferDto,
  DeckInventoryRequirementCardDto,
  DeckInventoryRequirementsDto,
} from "./dto/deck-inventory-requirements.dto";

@Injectable()
export class DeckInventoryService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepo: Repository<Deck>,
    @InjectRepository(CollectionItem)
    private readonly itemRepo: Repository<CollectionItem>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly localization: CatalogLocalizationService,
  ) {}

  /**
   * Compares deck requirements against user's owned available inventory (INT-01).
   *
   * - Ignores items currently reserved for sale (uses quantityAvailable).
   * - Excludes Wishlist collections so desired cards do not inflate ownership.
   * - Provides active marketplace listings for missing copies.
   *
   * @param deckId Target deck ID.
   * @param user Authenticated user checking their inventory.
   * @returns Requirements and availability breakdown.
   */
  async getDeckInventoryRequirements(
    deckId: number,
    user?: User,
  ): Promise<DeckInventoryRequirementsDto> {
    const deck = await this.deckRepo.findOne({
      where: { id: deckId },
      relations: [
        "cards",
        "cards.card",
        "cards.card.translations",
        "cards.card.pokemonDetails",
      ],
    });

    if (!deck) {
      throw new NotFoundException(`Deck #${deckId} introuvable`);
    }

    const deckCards = deck.cards || [];
    await this.localization.resolveLabels(deckCards);

    // Map owned available quantities by card ID for this user
    const ownedAvailableByCard = new Map<string, number>();

    if (user) {
      const userItems = await this.itemRepo.find({
        where: {
          collection: { user: { id: user.id } },
        },
        relations: ["pokemonCard", "collection"],
      });

      for (const item of userItems) {
        // Exclude Wishlist entries from physical ownership
        if (item.collection?.name?.toLowerCase() === "wishlist") {
          continue;
        }
        if (!item.pokemonCard) continue;

        const available = item.quantityAvailable ?? item.quantity ?? 0;
        const current = ownedAvailableByCard.get(item.pokemonCard.id) || 0;
        ownedAvailableByCard.set(item.pokemonCard.id, current + available);
      }
    }

    let totalCardsRequired = 0;
    let totalCardsOwned = 0;
    let totalCardsMissing = 0;

    const cardsResult: DeckInventoryRequirementCardDto[] = [];

    for (const dc of deckCards) {
      const card = dc.card;
      if (!card) continue;

      const required = dc.qty || 1;
      totalCardsRequired += required;

      const ownedAvailable = ownedAvailableByCard.get(card.id) || 0;
      const creditedOwned = Math.min(required, ownedAvailable);
      const missing = Math.max(0, required - ownedAvailable);

      totalCardsOwned += creditedOwned;
      totalCardsMissing += missing;

      let offers: DeckCardOfferDto[] = [];
      if (missing > 0) {
        const matchingListings = await this.listingRepo.find({
          where: {
            pokemonCard: { id: card.id },
            status: ListingStatus.ACTIVE,
            quantityAvailable: MoreThan(0),
          },
          relations: ["seller", "cardState"],
          order: { price: "ASC" },
          take: 5,
        });

        offers = matchingListings.map((l) => ({
          listingId: l.id,
          sellerId: l.seller.id,
          sellerName:
            `${l.seller.firstName || ""} ${l.seller.lastName || ""}`.trim() ||
            `Vendeur #${l.seller.id}`,

          price: Number(l.price),
          currency: l.currency,
          quantityAvailable: l.quantityAvailable,
          shippingCost: Number(l.shippingCost),
          cardState: l.cardState || null,
        }));
      }

      cardsResult.push({
        cardId: card.id,
        tcgDexId: card.tcgDexId,
        name: card.name || card.tcgDexId || card.id,
        image: card.image,
        requiredQuantity: required,
        ownedAvailableQuantity: ownedAvailable,
        missingQuantity: missing,
        offers,
      });
    }

    return {
      deckId,
      totalCardsRequired,
      totalCardsOwned,
      totalCardsMissing,
      isFullyOwned: totalCardsMissing === 0,
      cards: cardsResult,
    };
  }
}
