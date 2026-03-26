import { useQuery } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import DeckCard from "./DeckCard";
import { Skeleton } from "@components/ui/skeleton";
import { H2 } from "@components/Shared/Titles";
import { Flame } from "lucide-react";

export default function TrendingDecks() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-decks"],
    queryFn: () =>
      decksService.getPaginated({
        sortBy: "views",
        sortOrder: "DESC",
        limit: 10,
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 mb-12">
        <H2>Tendances</H2>
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

  if (!data?.data?.length) return null;

  return (
    <div className="space-y-6 mb-12">
      <H2 className="flex items-center gap-2">
        <Flame className="w-6 h-6 text-orange-500" /> Tendances
      </H2>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide">
        {data.data.map((deck) => (
          <div
            key={deck.id}
            className="min-w-[300px] md:min-w-[350px] snap-center"
          >
            <DeckCard
              deck={deck}
              onClick={() => decksService.incrementView(deck.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
