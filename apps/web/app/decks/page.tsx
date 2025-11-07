"use client";
import { H1 } from "@components/Shared/Titles";
import DecksFilters, {
  DecksFilters as DecksFiltersType,
} from "@app/decks/_components/DecksFilters";
import { useEffect, useState } from "react";
import { usePaginatedQuery } from "@hooks/usePaginatedQuery";
import DecksTable from "@app/decks/_components/DecksTable";
import DecksPagination from "@app/decks/_components/DecksPagination";
import { authedFetch } from "@utils/fetch";
import { Deck } from "@/types/Decks";
import { decksService } from "@/services/decks.service";
import { DeckFormat } from "@/types/deckFormat";
import { PaginatedResult } from "@/types/pagination";
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
      limit: 8,
      search: filters.search || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      formatId: filters.format || undefined,
    },
  );

  const tableHeaders: { label: string; key: keyof Deck | string }[] = [
    { label: "Nom", key: "name" },
    { label: "Type", key: "format.type" },
  ];

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
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <div className="max-w-5xl mx-auto">
        <H1
          className="text-center mb-2"
          variant="primary"
        >
          Decks
        </H1>
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

        <div className="rounded-xl shadow-2xl bg-card/80 backdrop-blur-md border border-border overflow-hidden">
          <DecksTable
            data={data}
            dataLoading={isLoading}
            error={error}
            tableHeaders={tableHeaders}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            setFilters={(f) => setFilters((prev: any) => ({ ...prev, ...f }))}
          />
        </div>
        {data && (
          <DecksPagination
            meta={data.meta}
            page={page}
            setPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
