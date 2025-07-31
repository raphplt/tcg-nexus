"use client";
import React, { useState } from "react";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { tournamentService } from "@/services/tournament.service";
import type { PaginatedResult } from "@/types/pagination";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { Tournament } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { TournamentsFilters } from "./_components/TournamentsFilters";
import { TournamentsTable } from "./_components/TournamentsTable";
import { TournamentsPagination } from "./_components/TournamentsPagination";
import {
  typeOptions,
  statusOptions,
  sortOptions,
  statusColor,
  typeColor,
} from "./utils";
import { H1 } from "@/components/Shared/Titles";

export default function TournamentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    status: "",
    location: "",
    startDateFrom: "",
    startDateTo: "",
    sortBy: "startDate",
    sortOrder: "ASC" as "ASC" | "DESC",
  });

  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Tournament>
  >(
    [
      "tournaments",
      page,
      filters.search,
      filters.type,
      filters.status,
      filters.location,
      filters.startDateFrom,
      filters.startDateTo,
      filters.sortBy,
      filters.sortOrder,
    ],
    tournamentService.getPaginated,
    {
      page,
      limit: 8,
      search: filters.search || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      location: filters.location || undefined,
      startDateFrom: filters.startDateFrom || undefined,
      startDateTo: filters.startDateTo || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  );

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "",
      status: "",
      location: "",
      startDateFrom: "",
      startDateTo: "",
      sortBy: "startDate",
      sortOrder: "ASC",
    });
    setPage(1);
  };

  const tableHeaders: { label: string; key: keyof Tournament }[] = [
    { label: "Nom", key: "name" },
    { label: "Date", key: "startDate" },
    { label: "Lieu", key: "location" },
    { label: "Type", key: "type" },
    { label: "Statut", key: "status" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-2">
      <div className="max-w-5xl mx-auto">
        <H1
          className="text-center mb-2"
          variant="primary"
        >
          Tournois Pokémon
        </H1>
        <p className="text-center text-muted-foreground mb-10 text-lg">
          Découvrez et inscrivez-vous aux prochains tournois !
        </p>
        <TournamentsFilters
          filters={filters}
          setFilters={(newFilters) => {
            setFilters((prev) => ({ ...prev, ...newFilters }));
            setPage(1);
          }}
          typeOptions={typeOptions}
          statusOptions={statusOptions}
          sortOptions={sortOptions}
          resetFilters={resetFilters}
        />

        {user?.isPro  && (
          <div className="flex justify-end mb-4">
            <Link href="/tournaments/create">
              <Button variant="default">Créer un tournoi</Button>
            </Link>
          </div>
        )}
        <div className="rounded-xl shadow-2xl bg-card/80 backdrop-blur-md border border-border overflow-hidden">
          <TournamentsTable
            data={data}
            isLoading={isLoading}
            error={error}
            tableHeaders={tableHeaders}
            statusColor={statusColor}
            typeColor={typeColor}
            tournamentStatusTranslation={tournamentStatusTranslation}
            tournamentTypeTranslation={tournamentTypeTranslation}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            setFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          />
        </div>
        {data && (
          <TournamentsPagination
            meta={data.meta}
            page={page}
            setPage={setPage}
          />
        )}
      </div>
    </div>
  );
}
