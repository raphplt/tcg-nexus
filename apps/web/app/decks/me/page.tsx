"use client";
import { H1 } from "@components/Shared/Titles";
import DecksFilters, {
  DecksFilters as DecksFiltersType,
} from "@app/decks/_components/DecksFilters";
import React, { useEffect, useState } from "react";
import DecksTable from "@app/decks/_components/DecksTable";
import DecksPagination from "@app/decks/_components/DecksPagination";
import { authedFetch } from "@utils/fetch";
import { useAuth } from "@/contexts/AuthContext";
import { Deck } from "@/types/Decks";
import { decksService } from "@/services/decks.service";
import { DeckFormat } from "@/types/deckFormat";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
export default function MyDecksPage() {
  const { isAuthenticated } = useAuth();
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
  const { data, isLoading, error } = decksService.useUserDecksPaginated(
    page,
    filters,
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
      setFormatList(res);
    });
  }, []);
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Alert
          variant="destructive"
          className="mx-auto max-w-3xl"
        >
          <AlertCircleIcon />
          <AlertTitle>Connexion requise.</AlertTitle>
          <AlertDescription>
            <p>Vous devez être connecté pour voir vos decks.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <div className="max-w-5xl mx-auto">
        <H1
          className="text-center mb-2"
          variant="primary"
        >
          Mes decks
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
