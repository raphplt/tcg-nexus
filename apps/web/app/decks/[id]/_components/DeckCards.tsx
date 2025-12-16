import { Deck } from "@/types/Decks";
import { DeckCard } from "@/types/deck-cards";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Layers } from "lucide-react";

interface DeckCardsProps {
  deck: Deck;
}

const normalizeCategory = (cat?: string) =>
  cat?.toLowerCase().replace("é", "e") || "";

const CardGrid = ({
  cards,
  emptyLabel = "Aucune carte",
}: {
  cards: DeckCard[];
  emptyLabel?: string;
}) => {
  if (!cards.length) {
    return (
      <div className="text-sm text-muted-foreground py-4">{emptyLabel}</div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
      {cards.map((deckCard) => (
        <div
          key={deckCard.id}
          className="rounded-lg border bg-card hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="relative h-40 bg-muted/40">
            {deckCard.card?.image ? (
              <Image
                src={`${deckCard.card.image}/low.png`}
                alt={deckCard.card.name || "Carte"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Layers className="w-6 h-6" />
              </div>
            )}
            <Badge className="absolute top-2 left-2">x{deckCard.qty}</Badge>
            <Badge
              variant="secondary"
              className="absolute top-2 right-2"
            >
              {deckCard.role === "side" ? "Side" : "Main"}
            </Badge>
          </div>
          <div className="p-3 space-y-1">
            <div className="font-semibold line-clamp-1">
              {deckCard.card?.name || "Carte inconnue"}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {deckCard.card?.set?.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

function CardSection({ title, cards }: { title: string; cards: DeckCard[] }) {
  if (cards.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">
            {cards.reduce((acc, c) => acc + c.qty, 0)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((deckCard) => (
            <div
              key={deckCard.id}
              className="flex items-center gap-3 p-2 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
            >
              <div className="relative w-12 h-16 shrink-0 bg-muted rounded overflow-hidden">
                {deckCard.card?.image ? (
                  <Image
                    src={deckCard.card.image + "/low.png"}
                    alt={deckCard.card.name || "Carte"}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {deckCard.card?.name || "Carte inconnue"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {deckCard.card?.set?.name}
                </div>
              </div>
              <div className="font-bold text-lg w-8 text-center">
                {deckCard.qty}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeckCards({ deck }: DeckCardsProps) {
  const mainCards = deck.cards?.filter((c) => c.role === "main") || [];
  const sideCards = deck.cards?.filter((c) => c.role === "side") || [];

  const pokemonCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "pokemon",
    ) || [];
  const trainerCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "trainer",
    ) || [];
  const energyCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "energy",
    ) || [];

  const otherCards =
    deck.cards?.filter((c) => {
      const cat = normalizeCategory(c.card?.category);
      return cat !== "pokemon" && cat !== "trainer" && cat !== "energy";
    }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>Cartes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Parcourez les cartes du deck et leurs quantités.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="main">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="main">
                Principal ({mainCards.length})
              </TabsTrigger>
              <TabsTrigger value="side">Side ({sideCards.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="main">
              <CardGrid cards={mainCards} />
            </TabsContent>
            <TabsContent value="side">
              <CardGrid
                cards={sideCards}
                emptyLabel="Aucune carte side"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CardSection
        title="Pokémon"
        cards={pokemonCards}
      />
      <CardSection
        title="Dresseurs"
        cards={trainerCards}
      />
      <CardSection
        title="Energies"
        cards={energyCards}
      />
      <CardSection
        title="Autres"
        cards={otherCards}
      />
    </div>
  );
}
