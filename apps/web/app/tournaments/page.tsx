"use client";
import React, { useState } from "react";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { tournamentService } from "@/services/tournament.service";
import type { PaginatedResult } from "@/types/pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { Tournament } from "@/types/tournament";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const statusColor: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OUVERT: "default",
  FERME: "secondary",
  ANNULE: "destructive",
};

const typeColor: Record<string, "default" | "secondary" | "outline"> = {
  Standard: "default",
  Draft: "secondary",
  Special: "outline",
};

export default function TournamentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePaginatedQuery<
    PaginatedResult<Tournament>
  >(["tournaments"], tournamentService.getPaginated, {
    page,
    limit: 8,
    sortBy: "startDate",
    sortOrder: "ASC",
  });

  const tableHeaders = [
    { label: "Nom", key: "name" },
    { label: "Date", key: "startDate" },
    { label: "Lieu", key: "location" },
    { label: "Type", key: "type" },
    { label: "Statut", key: "status" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-2">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center mb-2 tracking-tight text-primary">
          Tournois Pokémon
        </h1>
        <p className="text-center text-muted-foreground mb-10 text-lg">
          Découvrez et inscrivez-vous aux prochains tournois !
        </p>

        {user?.isPro  && (
          <div className="flex justify-end mb-4">
            <Link href="/tournaments/create">
              <Button variant="default">Créer un tournoi</Button>
            </Link>
          </div>
        )}
        <div className="rounded-xl shadow-2xl bg-card/80 backdrop-blur-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {tableHeaders.map((header) => (
                  <TableHead key={header.key}>{header.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-lg animate-pulse"
                  >
                    Chargement des tournois...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-destructive py-8"
                  >
                    Erreur lors du chargement des tournois
                  </TableCell>
                </TableRow>
              ) : data?.data?.length ? (
                data.data.map((tournament) => (
                  <TableRow
                    key={tournament.id}
                    className="transition-all hover:scale-[1.01] hover:shadow-lg"
                  >
                    <TableCell className="font-semibold text-lg text-primary">
                      {tournament.name}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {new Date(tournament.startDate).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(tournament.endDate).toLocaleDateString()}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* <MapPin className="w-4 h-4" /> */}
                      {tournament.location || (
                        <span className="italic text-muted-foreground">
                          À venir
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          typeColor[
                            tournament.type as keyof typeof typeColor
                          ] || "outline"
                        }
                      >
                        {
                          tournamentTypeTranslation[
                            tournament.type as keyof typeof tournamentTypeTranslation
                          ]
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusColor[tournament.status] || "secondary"}
                      >
                        {tournamentStatusTranslation[tournament.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Aucun tournoi trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(page - 1);
                  }}
                  aria-disabled={!data.meta.hasPreviousPage}
                  tabIndex={!data.meta.hasPreviousPage ? -1 : 0}
                  className={
                    !data.meta.hasPreviousPage
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
              {Array.from({ length: data.meta.totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={data.meta.currentPage === i + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(i + 1);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(page + 1);
                  }}
                  aria-disabled={!data.meta.hasNextPage}
                  tabIndex={!data.meta.hasNextPage ? -1 : 0}
                  className={
                    !data.meta.hasNextPage
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
