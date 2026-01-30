import React from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Separator } from "@components/ui/separator";
import { Layers } from "lucide-react";
import { AddedCard } from "../deckForm.schema";
import { getCardImage } from "@/utils/images";

const StatBlock = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-lg border bg-card/60 p-3 text-center">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-xl font-semibold">{value}</p>
  </div>
);

interface DeckStatsSectionProps {
  cards: AddedCard[];
  mainCount: number;
  sideCount: number;
}

export const DeckStatsSection: React.FC<DeckStatsSectionProps> = ({
  cards,
  mainCount,
  sideCount,
}) => {
  return (
    <Card className="bg-linear-to-br from-primary/5 via-background to-secondary/10 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Aperçu rapide
        </CardTitle>
        <CardDescription>
          Suivez en direct la répartition de vos cartes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatBlock
            label="Total cartes"
            value={mainCount + sideCount}
          />
          <StatBlock
            label="Principal"
            value={mainCount}
          />
          <StatBlock
            label="Side"
            value={sideCount}
          />
          <StatBlock
            label="Variétés"
            value={cards.length}
          />
        </div>
        <Separator />
        <div className="flex -space-x-3">
          {cards.slice(0, 4).map((c, index) => (
            <div
              key={`${c.cardId}-${index}`}
              className="relative w-16 h-24 rounded-lg overflow-hidden border border-border/60 shadow-sm bg-card"
            >
              <Image
                src={getCardImage(c.card, "low")}
                alt={c.card?.name || "Carte"}
                fill
                className="object-cover"
              />
              <Badge className="absolute bottom-1 right-1 text-[10px]">
                x{c.qty}
              </Badge>
            </div>
          ))}
          {cards.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Ajoutez vos premières cartes pour voir l’aperçu.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
