import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Eye, Minus, Plus, Trash2 } from "lucide-react";
import { AddedCard } from "../deckForm.schema";
import { getCardImage } from "@/utils/images";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SelectedCardsSectionProps {
  cards: AddedCard[];
  mainCount: number;
  sideCount: number;
  updateCardQty: (cardId: string, role: string, qty: number) => void;
  removeCard: (cardId?: string, role?: string) => void;
  className?: string;
  sticky?: boolean;
}

const PreviewGrid = ({
  cards,
  onQtyChange,
  onRemove,
  roleLabel,
}: {
  cards: AddedCard[];
  onQtyChange: (cardId: string, role: string, qty: number) => void;
  onRemove: (cardId?: string, role?: string) => void;
  roleLabel: string;
}) => {
  const t = useTranslations("DeckCardList");

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        {roleLabel === "main" ? t("emptyMain") : t("emptySide")}
      </div>
    );
  }
  return (
    <div className="max-h-[calc(100vh-15rem)] space-y-1.5 overflow-y-auto pr-1">
      {cards.map((c, index) => (
        <div
          key={`${c.cardId}-${c.role}-${index}`}
          className="flex items-center gap-2 rounded-lg border bg-card p-2 transition-colors hover:bg-accent/50"
        >
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-muted">
            <Image
              src={getCardImage(c.card, "low")}
              alt={c.card?.name || t("cardFallback")}
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-sm">
              {c.card?.name || "Carte"}
            </div>
            <div className="text-xs text-muted-foreground">
              {c.card?.set?.name}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={c.qty <= 1}
              aria-label={t("decrease", {
                name: c.card?.name || t("cardFallback"),
              })}
              onClick={() => onQtyChange(c.cardId!, c.role, c.qty - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              min={1}
              value={c.qty}
              onChange={(e) =>
                onQtyChange(c.cardId!, c.role, parseInt(e.target.value) || 1)
              }
              aria-label={t("quantity", {
                name: c.card?.name || t("cardFallback"),
              })}
              className="h-7 w-11 px-1 text-center text-xs tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label={t("increase", {
                name: c.card?.name || t("cardFallback"),
              })}
              onClick={() => onQtyChange(c.cardId!, c.role, c.qty + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={t("remove", {
                name: c.card?.name || t("cardFallback"),
              })}
              onClick={() => onRemove(c.cardId, c.role)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

/** Renders the editable main and side lists of the deck being built. */
export const SelectedCardsSection: React.FC<SelectedCardsSectionProps> = ({
  cards,
  mainCount,
  sideCount,
  updateCardQty,
  removeCard,
  className,
  sticky = true,
}) => {
  const t = useTranslations("DeckCardList");

  return (
    <Card
      className={cn(
        "h-fit border-border/60 shadow-sm",
        sticky && "xl:sticky xl:top-4",
        className,
      )}
    >
      <CardHeader className="space-y-1 p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary" />
          {t("deckPreview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-1">
        <Tabs defaultValue="main">
          <TabsList className="grid h-8 grid-cols-2">
            <TabsTrigger value="main" className="text-xs">
              {t("main")} ({mainCount})
            </TabsTrigger>
            <TabsTrigger value="side" className="text-xs">
              {t("side")} ({sideCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="main" className="mt-2">
            <PreviewGrid
              cards={cards.filter((c) => c.role === "main")}
              onQtyChange={updateCardQty}
              onRemove={removeCard}
              roleLabel="main"
            />
          </TabsContent>
          <TabsContent value="side" className="mt-2">
            <PreviewGrid
              cards={cards.filter((c) => c.role === "side")}
              onQtyChange={updateCardQty}
              onRemove={removeCard}
              roleLabel="side"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
