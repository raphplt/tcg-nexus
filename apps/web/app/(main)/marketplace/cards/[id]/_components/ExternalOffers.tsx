"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalOffer,
  ExternalOfferSource,
  marketplaceService,
} from "@/services/marketplace.service";
import { useCurrencyStore } from "@/store/currency.store";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

interface ExternalOffersProps {
  cardId: string;
}

const SOURCE_LABELS: Record<ExternalOfferSource, string> = {
  cardmarket: "CardMarket",
  tcgplayer: "TCGPlayer",
  ebay: "eBay",
};

const SOURCE_DESCRIPTIONS: Record<ExternalOfferSource, string> = {
  cardmarket: "Marché européen de référence",
  tcgplayer: "Marché nord-américain",
  ebay: "Enchères et ventes directes",
};

/**
 * Affiche les offres de partenaires externes (CardMarket / TCGPlayer / eBay)
 * triées par prix. Les clics ouvrent le site marchand dans un nouvel onglet.
 */
export function ExternalOffers({ cardId }: ExternalOffersProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["card-external-offers", cardId],
    queryFn: () => marketplaceService.getExternalOffers(cardId),
    enabled: !!cardId,
  });

  if (isLoading || !data || data.offers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Disponible ailleurs</span>
          <Badge variant="outline" className="text-xs font-normal">
            Redirection vers le site marchand
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.offers.map((offer) => (
          <ExternalOfferRow key={offer.source} offer={offer} />
        ))}
      </CardContent>
    </Card>
  );
}

function ExternalOfferRow({ offer }: { offer: ExternalOffer }) {
  const { formatPrice } = useCurrencyStore();

  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-accent"
    >
      <div className="flex flex-col">
        <span className="font-semibold">{SOURCE_LABELS[offer.source]}</span>
        <span className="text-xs text-muted-foreground">
          {SOURCE_DESCRIPTIONS[offer.source]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {offer.price != null ? (
          <span className="font-semibold text-primary">
            {formatPrice(offer.price, offer.currency ?? "EUR")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Voir les offres</span>
        )}
        <ExternalLink className="size-4 text-muted-foreground" />
      </div>
    </a>
  );
}
