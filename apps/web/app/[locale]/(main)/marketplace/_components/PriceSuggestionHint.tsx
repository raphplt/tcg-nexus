"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
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
  cardStates.find((s) => s.value === value)?.label ?? value ?? "";

/**
 * Suggested price chip beneath the price input, based on active listings or the market reference price; tapping it applies the price.
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

  if (!data?.suggestedPrice) return null;

  const suggestedPrice = data.suggestedPrice;
  const { count } = data.listings;
  const basis =
    data.basis === "same-state"
      ? t("sameState", { count, state: stateLabel(cardState) })
      : data.basis === "all-states"
        ? t("allStates", { count })
        : t("marketReference");
  const price = formatPrice(suggestedPrice, data.currency);

  return (
    <button
      type="button"
      title={basis}
      aria-label={t("apply", { price })}
      onClick={() => onApply(suggestedPrice)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{t("suggested", { price })}</span>
    </button>
  );
}
