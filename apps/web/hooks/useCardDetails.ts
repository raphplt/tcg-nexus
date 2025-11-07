import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { PokemonCardType } from "@/types/cardPokemon";
import { CardStatistics } from "@/services/marketplace.service";
import { PaginatedResult } from "@/types/pagination";
import { Listing } from "@/types/listing";
import { cardEventTracker } from "@/services/card-event-tracker.service";

interface UseCardDetailsParams {
  cardId: string | undefined;
  currencyFilter?: string;
  cardStateFilter?: string;
}

export function useCardDetails({
  cardId,
  currencyFilter = "all",
  cardStateFilter = "all",
}: UseCardDetailsParams) {
  // Récupère les détails de la carte
  const {
    data: card,
    isLoading: loadingCard,
    error: cardError,
  } = useQuery<PokemonCardType>({
    queryKey: ["pokemon-card", cardId],
    queryFn: () => pokemonCardService.getById(cardId!),
    enabled: !!cardId,
  });

  // Récupère les statistiques de la carte
  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
  } = useQuery<CardStatistics>({
    queryKey: ["card-stats", cardId, currencyFilter, cardStateFilter],
    queryFn: () =>
      marketplaceService.getCardStatistics(
        cardId!,
        currencyFilter && currencyFilter !== "all"
          ? currencyFilter
          : undefined,
        cardStateFilter && cardStateFilter !== "all"
          ? cardStateFilter
          : undefined,
      ),
    enabled: !!cardId,
  });

  // Récupère les offres disponibles pour la carte
  const {
    data: listings,
    isLoading: loadingListings,
    error: listingsError,
  } = useQuery<PaginatedResult<Listing>>({
    queryKey: ["card-listings", cardId, currencyFilter, cardStateFilter],
    queryFn: () =>
      marketplaceService.getCardListings(cardId!, {
        currency:
          currencyFilter && currencyFilter !== "all"
            ? currencyFilter
            : undefined,
        cardState:
          cardStateFilter && cardStateFilter !== "all"
            ? cardStateFilter
            : undefined,
        limit: 50,
      }),
    enabled: !!cardId,
  });

  // Track view event
  useEffect(() => {
    if (cardId && card) {
      cardEventTracker.trackView(cardId, {
        referrer: document.referrer || undefined,
      });
    }
  }, [cardId, card]);

  // Computed values
  const filteredListings = listings?.data || [];
  const minPriceListing =
    filteredListings.length > 0
      ? filteredListings.reduce((min, listing) =>
          parseFloat(listing.price.toString()) <
          parseFloat(min.price.toString())
            ? listing
            : min,
        )
      : null;

  const priceHistory = stats?.priceHistory || [];
  const isGoodDeal =
    stats &&
    minPriceListing &&
    stats.avgPrice &&
    parseFloat(minPriceListing.price.toString()) < stats.avgPrice * 0.8;

  return {
    card,
    stats,
    listings: filteredListings,
    minPriceListing,
    priceHistory,
    isGoodDeal,
    isLoading: loadingCard || loadingStats || loadingListings,
    loadingCard,
    loadingStats,
    loadingListings,
    error: cardError || statsError || listingsError,
  };
}

