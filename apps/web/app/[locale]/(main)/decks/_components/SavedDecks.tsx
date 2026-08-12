import { H2 } from "@components/Shared/Titles";
import { Skeleton } from "@components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookmarkCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { decksService } from "@/services/decks.service";
import DeckCard from "./DeckCard";

export default function SavedDecks() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["saved-decks", { limit: 8 }],
    queryFn: () => decksService.getSavedDecksPaginated({ limit: 8 }),
    enabled: !!user,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="space-y-6 mb-12">
        <H2 className="flex items-center gap-2">
          <BookmarkCheck className="w-6 h-6 text-primary" /> Ma Bibliothèque
        </H2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.data?.length) return null;

  return (
    <div className="space-y-6 mb-12">
      <H2 className="flex items-center gap-2">
        <BookmarkCheck className="w-6 h-6 text-primary" /> Ma Bibliothèque
        <span className="text-sm font-normal text-muted-foreground">
          ({data.meta.totalItems})
        </span>
      </H2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.data.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onClick={() => decksService.incrementView(deck.id)}
          />
        ))}
      </div>
    </div>
  );
}
