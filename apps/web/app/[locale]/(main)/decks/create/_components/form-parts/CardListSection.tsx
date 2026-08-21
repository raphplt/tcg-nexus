import { useTranslations } from "next-intl";
import React from "react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Badge } from "@components/ui/badge";
import { Separator } from "@components/ui/separator";
import { AlertCircle, Plus } from "lucide-react";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { PokemonCardType } from "@/types/cardPokemon";
import type { PaginatedResult } from "@/types/pagination";
import { getCardImage } from "@/utils/images";

interface CardListSectionProps {
  cardsLoading: boolean;
  allCards: (PokemonCardType | { card: PokemonCardType })[];
  meta?: PaginatedResult<PokemonCardType>["meta"];
  page: number;
  setPage: (page: number) => void;
  qtyByCard: Record<string, number>;
  setQtyByCard: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  roleByCard: Record<string, string>;
  setRoleByCard: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addCard: (card: PokemonCardType, qty: number, role: string) => void;
  ownedQuantityByCard?: Record<string, number>;
  deckQuantityByCard?: Record<string, number>;
  emptyMessage?: string;
}

/** Renders paginated card choices with compact quantity and role controls. */
export const CardListSection: React.FC<CardListSectionProps> = ({
  cardsLoading,
  allCards,
  meta,
  page,
  setPage,
  qtyByCard,
  setQtyByCard,
  roleByCard,
  setRoleByCard,
  addCard,
  ownedQuantityByCard = {},
  deckQuantityByCard = {},
  emptyMessage,
}) => {
  const t = useTranslations("DeckCardList");
  return (
    <div className="space-y-3">
      <Separator className="mt-1" />

      {cardsLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-2.5">
          {Array.from({ length: 12 }).map((_: unknown, i: number) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : allCards.length ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-2.5">
            {allCards.map((item) => {
              const card = "card" in item ? item.card : item;
              const ownedQuantity = ownedQuantityByCard[card.id];
              const remainingOwnedQuantity = ownedQuantity
                ? Math.max(
                    0,
                    ownedQuantity - (deckQuantityByCard[card.id] ?? 0),
                  )
                : undefined;
              const hasAddedAllOwnedCopies = remainingOwnedQuantity === 0;
              const maximumQuantity = remainingOwnedQuantity || undefined;
              const qty = Math.min(
                maximumQuantity ?? Number.POSITIVE_INFINITY,
                qtyByCard[card.id] || 1,
              );
              const role = (roleByCard[card.id] as string) || "main";
              return (
                <article
                  key={card.id}
                  className="relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-3/4 bg-muted/40">
                    <Image
                      src={getCardImage(card, "low")}
                      alt={card.name || t("cardFallback")}
                      fill
                      className="object-contain"
                    />
                    {card.rarity && (
                      <Badge className="absolute left-1 top-1 max-w-[calc(100%-0.5rem)] truncate px-1 py-0 text-[10px] backdrop-blur-sm">
                        {card.rarity}
                      </Badge>
                    )}
                    {card.set?.name && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate px-1 py-0 text-[10px]"
                      >
                        {card.set.name}
                      </Badge>
                    )}
                    {ownedQuantity ? (
                      <Badge className="absolute bottom-1 right-1 bg-emerald-600 px-1.5 py-0 text-[10px] text-white">
                        {t("owned", { count: ownedQuantity })}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-2">
                    <h3 className="line-clamp-1 min-h-4 text-xs font-semibold">
                      {card.name || t("cardFallback")}
                    </h3>
                    <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-1">
                      <Input
                        type="number"
                        min={1}
                        max={maximumQuantity}
                        disabled={hasAddedAllOwnedCopies}
                        value={qty}
                        aria-label={t("quantity", {
                          name: card.name || t("cardFallback"),
                        })}
                        onChange={(event) => {
                          const nextQuantity = Math.min(
                            maximumQuantity ?? Number.POSITIVE_INFINITY,
                            Math.max(1, Number(event.target.value) || 1),
                          );
                          setQtyByCard((prev) => ({
                            ...prev,
                            [card.id]: nextQuantity,
                          }));
                        }}
                        className="h-8 w-full px-1 text-center text-xs tabular-nums"
                      />
                      <Select
                        value={role}
                        disabled={hasAddedAllOwnedCopies}
                        onValueChange={(value) =>
                          setRoleByCard((prev) => ({
                            ...prev,
                            [card.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 min-w-0 px-2 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">{t("main")}</SelectItem>
                          <SelectItem value="side">{t("side")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-auto h-8 w-full text-xs"
                      disabled={hasAddedAllOwnedCopies}
                      onClick={() => addCard(card, qty, role)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {hasAddedAllOwnedCopies ? t("allAdded") : t("add")}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          {meta && (
            <PaginatedNav
              meta={meta}
              page={page}
              onPageChange={setPage}
              scrollToTop={false}
              className="mt-4"
            />
          )}
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          {emptyMessage || t("empty")}
        </div>
      )}
    </div>
  );
};
