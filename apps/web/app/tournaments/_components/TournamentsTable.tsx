import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tournament } from "@/types/tournament";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { PaginatedResult } from "@/types/pagination";
import { Button } from "@/components/ui/button";
import { tournamentService } from "@/services/tournament.service";
import { useAuth } from "@/contexts/AuthContext";


export interface Filters {
  search: string;
  type: string;
  status: string;
  location: string;
  startDateFrom: string;
  startDateTo: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface TournamentsTableProps {
  data: PaginatedResult<Tournament> | undefined;
  isLoading: boolean;
  error: Error | null;
  tableHeaders: { label: string; key: keyof Tournament }[];
  statusColor: Record<string, string>;
  typeColor: Record<string, string>;
  tournamentStatusTranslation: Record<string, string>;
  tournamentTypeTranslation: Record<string, string>;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  setFilters: (filters: Partial<Filters>) => void;
}

export function TournamentsTable({
  data,
  isLoading,
  error,
  tableHeaders,
  statusColor,
  typeColor,
  tournamentStatusTranslation,
  tournamentTypeTranslation,
  sortBy,
  sortOrder,
  setFilters,
}: TournamentsTableProps) {
  const handleSort = (key: string) => {
    if (sortBy === key) {
      setFilters({ sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    } else {
      setFilters({ sortBy: key, sortOrder: "ASC" });
    }
  };

  const { user } = useAuth();
  

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead
              key={header.key}
              onClick={() => handleSort(header.key)}
              className="cursor-pointer select-none group"
            >
              <span className="inline-flex items-center gap-1">
                {header.label}
                {sortBy === header.key &&
                  (sortOrder === "ASC" ? (
                    <ArrowUp className="w-3 h-3 text-primary group-hover:text-primary/80" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-primary group-hover:text-primary/80" />
                  ))}
              </span>
            </TableHead>
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
          data.data.map((tournament: Tournament) => (
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
                {tournament.location || (
                  <span className="italic text-muted-foreground">À venir</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    (typeColor[
                      tournament.type as keyof typeof typeColor
                    ] as any) || "outline"
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
                  variant={
                    (statusColor[tournament.status] as any) || "secondary"
                  }
                >
                  {tournamentStatusTranslation[tournament.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant={"ghost"}
                  color="primary"
                  onClick={async () => {
                    try {
                      const tournamentId = tournament.id; 
                      if (user) {
                        await tournamentService.register(tournamentId, user.id, "");
                      } else {
                        console.error("User is not authenticated.");
                      }
                      console.log("Tournoi rejoint avec succès !");
                    } catch (error) {
                      console.error(
                        "Erreur lors de la tentative de rejoindre le tournoi :",
                        error,
                      );
                    }
                  }}
                >
                  Rejoindre
                </Button>
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
  );
}
