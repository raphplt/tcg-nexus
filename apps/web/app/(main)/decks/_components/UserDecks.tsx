import { useQuery } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import DeckCard from "./DeckCard";
import { Skeleton } from "@components/ui/skeleton";
import { H2 } from "@components/Shared/Titles";
import { Button } from "@components/ui/button";
import { Plus, User as UserIcon, Download } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function UserDecks() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["user-decks"],
    queryFn: () => decksService.getUserDecksPaginated({ limit: 10 }),
    enabled: !!user,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-4 mb-12">
        <H2>Mes Decks</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-[300px] w-full rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-12">
      <div className="flex items-center justify-between">
        <H2 className="flex items-center gap-2">
          <UserIcon className="w-6 h-6 text-primary" /> Mes Decks
        </H2>
        <div className="flex items-center gap-2">
          <Link href="/decks/import">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Importer un deck
            </Button>
          </Link>
          <Link href="/decks/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Deck
            </Button>
          </Link>
        </div>
      </div>

      {data?.data?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.data.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onClick={() => decksService.incrementView(deck.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
          <p className="text-muted-foreground mb-4">
            Vous n'avez pas encore créé de deck.
          </p>
          <Link href="/decks/create">
            <Button variant="outline">Créer mon premier deck</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
