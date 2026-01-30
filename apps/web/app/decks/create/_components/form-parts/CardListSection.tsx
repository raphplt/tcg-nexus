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
import MarketplacePagination from "@/app/marketplace/_components/MarketplacePagination";
import { PokemonCardType } from "@/types/cardPokemon";
import { getCardImage } from "@/utils/images";

interface CardListSectionProps {
  cardsLoading: boolean;
  allCards: PokemonCardType[];
  meta: any;
  page: number;
  setPage: (page: number) => void;
  qtyByCard: Record<string, number>;
  setQtyByCard: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  roleByCard: Record<string, string>;
  setRoleByCard: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addCard: (card: PokemonCardType, qty: number, role: string) => void;
}

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
}) => {
  return (
    <div className="space-y-4">
      <Separator />

      {cardsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_: unknown, i: number) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : allCards.length ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {allCards.map((item: any) => {
              const card = (item.card || item) as PokemonCardType;
              const qty = qtyByCard[card.id] || 1;
              const role = (roleByCard[card.id] as string) || "main";
              return (
                <article
                  key={card.id}
                  className="relative rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden text-sm"
                >
                  <div className="relative aspect-3/4 bg-muted/40">
                    <Image
                      src={getCardImage(card, "low")}
                      alt={card.name || "Carte"}
                      fill
                      className="object-cover"
                    />
                    {card.rarity && (
                      <Badge className="absolute top-1 left-1 backdrop-blur-sm px-1 py-0 text-[10px]">
                        {card.rarity}
                      </Badge>
                    )}
                    {card.set?.name && (
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 px-1 py-0 text-[10px]"
                      >
                        {card.set.name}
                      </Badge>
                    )}
                  </div>
                  <div className="p-2 space-y-2">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold line-clamp-1 text-xs">
                        {card.name || "Carte"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) =>
                          setQtyByCard((prev) => ({
                            ...prev,
                            [card.id]: Number(e.target.value),
                          }))
                        }
                        className="w-12 h-7 text-xs px-1"
                      />
                      <Select
                        value={role}
                        onValueChange={(value) =>
                          setRoleByCard((prev) => ({
                            ...prev,
                            [card.id]: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-7 text-xs px-2 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">Main</SelectItem>
                          <SelectItem value="side">Side</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => addCard(card, qty, role)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          {meta && (
            <MarketplacePagination
              meta={meta}
              page={page}
              setPage={setPage}
            />
          )}
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          Aucune carte ne correspond à ces critères.
        </div>
      )}
    </div>
  );
};
