"use client";
import { H1 } from "@/components/Shared/Titles";
import { useState } from "react";
import MarketplaceFilters, {
  MarketplaceFilters as MarketplaceFiltersType,
} from "./_components/MarketplaceFilters";
import MarketplaceTable from "./_components/MarketplaceTable";
import MarketplacePagination from "./_components/MarketplacePagination";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { marketplaceService } from "@/services/marketplace.service";
import type { PaginatedResult } from "@/types/pagination";
import type { Listing } from "@/types/listing";

const cardStateOptions = [
  { label: "Tous", value: "" },
  { label: "NM (Near Mint)", value: "NM" },
  { label: "EX (Excellent)", value: "EX" },
  { label: "GD (Good)", value: "GD" },
  { label: "PL (Played)", value: "PL" },
  { label: "PO (Poor)", value: "PO" },
];
const currencyOptions = [
  { label: "Toutes", value: "" },
  { label: "EUR", value: "EUR" },
  { label: "USD", value: "USD" },
];
const sortOptions = [
  { label: "Date d'ajout", value: "createdAt" },
  { label: "Prix", value: "price" },
  { label: "Quantité", value: "quantityAvailable" },
];

export default function MarketplacePage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<MarketplaceFiltersType>({
    search: "",
    cardState: "",
    currency: "",
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Listing>
  >(
    [
      "listings",
      page,
      filters.search,
      filters.cardState,
      filters.currency,
      filters.sortBy,
      filters.sortOrder,
    ],
    marketplaceService.getPaginated,
    {
      page,
      limit: 8,
      search: filters.search || undefined,
      cardState: filters.cardState || undefined,
      currency: filters.currency || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  );

  const resetFilters = () => {
    setFilters({
      search: "",
      cardState: "",
      currency: "",
      sortBy: "createdAt",
      sortOrder: "DESC",
    });
    setPage(1);
  };

  const tableHeaders: { label: string; key: keyof Listing | string }[] = [
    { label: "Carte", key: "pokemonCard" },
    { label: "Prix", key: "price" },
    { label: "Qté", key: "quantityAvailable" },
    { label: "État", key: "cardState" },
    { label: "Expire", key: "expiresAt" },
    { label: "Vendeur", key: "seller" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <div className="max-w-5xl mx-auto">
        <H1
          className="text-center mb-2"
          variant="primary"
        >
          Marketplace
        </H1>
        <p className="text-center text-muted-foreground mb-10 text-lg">
          Découvrez et vendez vos cartes Pokémon !
        </p>
        <MarketplaceFilters
          filters={filters}
          setFilters={(newFilters) => {
            setFilters((prev) => ({ ...prev, ...newFilters }));
            setPage(1);
          }}
          cardStateOptions={cardStateOptions}
          currencyOptions={currencyOptions}
          sortOptions={sortOptions}
          resetFilters={resetFilters}
        />
        <div className="rounded-xl shadow-2xl bg-card/80 backdrop-blur-md border border-border overflow-hidden">
          <MarketplaceTable
            data={data}
            isLoading={isLoading}
            error={error}
            tableHeaders={tableHeaders}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            setFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          />
        </div>
        {data && (
          <MarketplacePagination
            meta={data.meta}
            page={page}
            setPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
