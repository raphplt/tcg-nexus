"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePriceSuggestion } from "@/hooks/useMarketplace";
import { formatPrice } from "@/utils/price";
import { cardStates } from "@/utils/variables";

interface PriceSuggestionHintProps {
  cardId?: string;
  cardState?: string;
  currency: string;
  onApply: (price: number) => void;
}

const stateLabel = (value?: string) =>
  cardStates.find((s) => s.value === value)?.label ?? value;

/**
 * Prix conseillé sous le champ de saisie : moyenne des annonces actives de la
 * carte, ou prix de référence du marché quand elle n'est pas encore en vente.
 */
export function PriceSuggestionHint({
  cardId,
  cardState,
  currency,
  onApply,
}: PriceSuggestionHintProps) {
  const { data, isLoading } = usePriceSuggestion(cardId, cardState, currency);

  if (!cardId) return null;

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground">
        Calcul du prix conseillé...
      </p>
    );
  }

  if (!data?.suggestedPrice) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucune référence de prix disponible pour cette carte.
      </p>
    );
  }

  const { count } = data.listings;
  const detail =
    data.basis === "same-state"
      ? `moyenne de ${count} annonce${count > 1 ? "s" : ""} en ${stateLabel(cardState)}`
      : data.basis === "all-states"
        ? `moyenne de ${count} annonce${count > 1 ? "s" : ""}, tous états confondus`
        : "prix de référence du marché";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Sparkles className="w-3.5 h-3.5 text-primary" />
      <span>
        Prix conseillé :{" "}
        <span className="font-semibold text-foreground">
          {formatPrice(data.suggestedPrice, data.currency)}
        </span>{" "}
        ({detail})
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={() => onApply(data.suggestedPrice as number)}
      >
        Utiliser ce prix
      </Button>
    </div>
  );
}
