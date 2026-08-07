"use client";
import { useTranslations } from "next-intl";
import { H1, H2 } from "@components/Shared/Titles";
import { Skeleton } from "@components/ui/skeleton";
import { usePaginatedQuery } from "@hooks/usePaginatedQuery";
import { authedFetch } from "@utils/fetch";
import { Library } from "lucide-react";
import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { PaginatedNav } from "@/components/Shared/PaginatedNav";
import { decksService } from "@/services/decks.service";
import { Deck } from "@/types/Decks";
import { DeckFormat } from "@/types/deckFormat";
import { PaginatedResult } from "@/types/pagination";
import DeckCard from "./_components/DeckCard";
import DecksFilters, { DecksFiltersTypes } from "./_components/DecksFilters";
import SavedDecks from "./_components/SavedDecks";
import TrendingDecks from "./_components/TrendingDecks";
import UserDecks from "./_components/UserDecks";

export default function DecksPage() {
  const t = useTranslations("Decks");
  const [page, setPage] = useState(1);
  const [formatList, setFormatList] = useState<[] | DeckFormat[]>([]);
  const [filters, setFilters] = useState<DecksFiltersTypes>({
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
    { label: t("allFormats"), value: "ALL" },
    ...formatList.map((data) => ({
      label: data.type,
      value: data.id.toString(),
    })),
  ];

  const sortOptions = [
    { label: t("sortCreatedAt"), value: "createdAt" },
    { label: t("sortName"), value: "name" },
    { label: t("sortType"), value: "format.type" },
    { label: t("sortViews"), value: "views" },
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
    <PageWrapper gradient="secondary">
      <div className="space-y-12">
        <div className="text-center space-y-4">
          <H1 variant="primary">{t("title")}</H1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>
        <TrendingDecks />
        <UserDecks />
        <SavedDecks />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <H2 className="flex items-center gap-2">
              <Library className="w-6 h-6 text-primary" />
              {t("allDecks")}
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
                <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-12">
              {t("loadError")}
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
                  <PaginatedNav
                    meta={data.meta}
                    page={page}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
