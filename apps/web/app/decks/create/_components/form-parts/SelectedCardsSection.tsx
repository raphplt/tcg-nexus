import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Eye, Trash2 } from "lucide-react";
import { AddedCard } from "../deckForm.schema";
import { getCardImage } from "@/utils/images";

interface SelectedCardsSectionProps {
  cards: AddedCard[];
  mainCount: number;
  sideCount: number;
  updateCardQty: (cardId: string, role: string, qty: number) => void;
  removeCard: (cardId?: string, role?: string) => void;
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
  if (cards.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Aucune carte {roleLabel === "main" ? "principale" : "side"}.
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
      {cards.map((c, index) => (
        <div
          key={`${c.cardId}-${c.role}-${index}`}
          className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="relative w-10 h-14 shrink-0 bg-muted rounded overflow-hidden">
              <Image
                src={getCardImage(c.card, "low")}
                alt={c.card?.name || "Carte"}
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
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={c.qty}
              onChange={(e) =>
                onQtyChange(c.cardId!, c.role, parseInt(e.target.value) || 1)
              }
              className="w-16 h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(c.cardId, c.role)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SelectedCardsSection: React.FC<SelectedCardsSectionProps> = ({
  cards,
  mainCount,
  sideCount,
  updateCardQty,
  removeCard,
}) => {
  return (
    <Card className="border border-border/60 shadow-lg h-fit xl:sticky xl:top-4">
      <CardHeader className="space-y-1 p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="w-4 h-4 text-primary" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <Tabs defaultValue="main">
          <TabsList className="grid grid-cols-2 h-8">
            <TabsTrigger
              value="main"
              className="text-xs"
            >
              Principal ({mainCount})
            </TabsTrigger>
            <TabsTrigger
              value="side"
              className="text-xs"
            >
              Side ({sideCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="main">
            <PreviewGrid
              cards={cards.filter((c) => c.role === "main")}
              onQtyChange={updateCardQty}
              onRemove={removeCard}
              roleLabel="main"
            />
          </TabsContent>
          <TabsContent value="side">
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
