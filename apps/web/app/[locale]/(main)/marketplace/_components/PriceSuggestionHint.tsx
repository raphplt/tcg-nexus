"use client";

import { useTranslations } from "next-intl";
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
 * Displays the suggested price beneath the input, based on active listings or the market reference price.
 */
export function PriceSuggestionHint({
  cardId,
  cardState,
  currency,
  onApply,
}: PriceSuggestionHintProps) {
  const t = useTranslations("PriceSuggestion");
  const { data, isLoading } = usePriceSuggestion(cardId, cardState, currency);

  if (!cardId) return null;

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{t("computing")}</p>;
  }

  if (!data?.suggestedPrice) {
    return <p className="text-xs text-muted-foreground">{t("noReference")}</p>;
  }

  const { count } = data.listings;
  const detail =
    data.basis === "same-state"
      ? `moyenne de ${count} annonce${count > 1 ? "s" : ""} en ${stateLabel(cardState)}`
      : data.basis === "all-states"
        ? `moyenne de ${count} annonce${count > 1 ? "s" : ""}, tous états confondus`
        : t("marketReference");

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
        {t("usePrice")}
      </Button>
    </div>
  );
}
