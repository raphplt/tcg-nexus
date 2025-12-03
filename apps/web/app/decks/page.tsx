"use client";
import { H1, H2 } from "@components/Shared/Titles";
import DecksFilters, {
  DecksFilters as DecksFiltersType,
} from "@app/decks/_components/DecksFilters";
import { useEffect, useState } from "react";
import { usePaginatedQuery } from "@hooks/usePaginatedQuery";
import DecksPagination from "@app/decks/_components/DecksPagination";
import { authedFetch } from "@utils/fetch";
import { Deck } from "@/types/Decks";
import { decksService } from "@/services/decks.service";
import { DeckFormat } from "@/types/deckFormat";
import { PaginatedResult } from "@/types/pagination";
import TrendingDecks from "./_components/TrendingDecks";
import UserDecks from "./_components/UserDecks";
import DeckCard from "./_components/DeckCard";
import { Skeleton } from "@components/ui/skeleton";
import { Library } from "lucide-react";

export default function DecksPage() {
  const [page, setPage] = useState(1);
  const [formatList, setFormatList] = useState<[] | DeckFormat[]>([]);
  const [filters, setFilters] = useState<DecksFiltersType>({
    search: "",
    format: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  const resetFilters = () => {
    setFilters({
      search: "",
      format: "",
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
    setPage(1);
  };

  const { data, isLoading, error } = usePaginatedQuery<PaginatedResult<Deck>>(
    ["decks", page, filters.search, filters.sortBy, filters.sortOrder],
    decksService.getPaginated,
    {
      page,
      limit: 12,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      formatId: filters.format || undefined,
    },
  );

  const formatOptions = [
    { label: "Tous", value: "ALL" },
    ...formatList.map((data) => ({
      label: data.type,
      value: data.id.toString(),
    })),
  ];

  const sortOptions = [
    { label: "Date de création", value: "createdAt" },
    { label: "Nom", value: "name" },
    { label: "Type", value: "format.type" },
    { label: "Vues", value: "views" },
  ];

  useEffect(() => {
    const listFormat = async () => {
      return await authedFetch("GET", "deck-format");
    };
    listFormat().then((res) => {
      setFormatList(res as DeckFormat[]);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <H1 variant="primary">Decks</H1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez les meilleurs decks de la communauté, créez les vôtres et
            partagez vos stratégies.
          </p>
        </div>
        <TrendingDecks />
        <UserDecks />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <H2 className="flex items-center gap-2">
              <Library className="w-6 h-6 text-primary" /> Tous les Decks
            </H2>
          </div>

          <DecksFilters
            filters={filters}
            resetFilters={resetFilters}
            formatOptions={formatOptions}
            sortOptions={sortOptions}
            setFilters={(newFilters) => {
              setFilters((prev: any) => ({ ...prev, ...newFilters }));
              setPage(1);
            }}
          />

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[300px] w-full rounded-xl"
                />
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-12">
              Une erreur est survenue lors du chargement des decks.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data?.data.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onClick={() => decksService.incrementView(deck.id)}
                  />
                ))}
              </div>

              {data && (
                <div className="mt-8">
                  <DecksPagination
                    meta={data.meta}
                    page={page}
                    setPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
