import { Deck } from "@/types/Decks";
import { Card } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Eye, Calendar, User, Layers } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";

interface DeckCardProps {
  deck: Deck;
  onClick?: () => void;
}

export default function DeckCard({ deck, onClick }: DeckCardProps) {
  const cards = deck.cards || [];
  const previewCards = cards.slice(0, 3);

  return (
    <Link
      href={`/decks/${deck.id}`}
      onClick={onClick}
    >
      <Card className="group relative overflow-hidden h-full hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1">
        <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
          {previewCards.length > 0 ? (
            <div className="flex gap-2 justify-center items-center h-full">
              {previewCards.map((deckCard, index) => (
                <div
                  key={deckCard.id || index}
                  className="relative w-16 h-24 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    zIndex: index,
                    transform: `rotate(${(index - 1) * 10}deg) translateY(${Math.abs(index - 1) * 5}px)`,
                  }}
                >
                  {deckCard.card?.image ? (
                    <Image
                      src={`${deckCard.card.image}/high.webp`}
                      alt={deckCard.card.name || "Carte"}
                      fill
                      className="object-contain drop-shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/20 rounded border border-dashed border-secondary/40 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/20">
              <Layers className="w-12 h-12 opacity-20" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <Badge
            className="absolute top-3 right-3 bg-primary/90 hover:bg-primary backdrop-blur-md shadow-lg"
            variant="default"
          >
            {deck.format?.type || "Standard"}
          </Badge>
        </div>

        <div className="p-5 space-y-3">
          <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">
            {deck.name}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="line-clamp-1">
              {deck.user?.firstName || "Anonyme"}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>{deck.views || 0} vues</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {format(new Date(deck.createdAt), "d MMM yyyy", { locale: fr })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
