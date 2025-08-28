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
import { Tournament, TournamentStatus } from "@/types/tournament";
import { ArrowUp, ArrowDown, Eye, UserPlus } from "lucide-react";
import type { PaginatedResult } from "@/types/pagination";
import { tournamentService } from "@/services/tournament.service";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export interface Filters {
  search: string;
  type: string;
  status: string;
  location: string;
  startDateFrom: string;
  startDateTo: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  userTournaments: Tournament[];
}

interface TournamentsTableProps {
  data: PaginatedResult<Tournament> | undefined;
  isLoading: boolean;
  error: Error | null;
  tableHeaders: { label: string; key: keyof Tournament | "actions" }[];
  statusColor: Record<string, string>;
  typeColor: Record<string, string>;
  tournamentStatusTranslation: Record<string, string>;
  tournamentTypeTranslation: Record<string, string>;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  setFilters: (filters: Partial<Filters>) => void;
  userTournaments: Tournament[];
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
  userTournaments,
}: TournamentsTableProps) {
  const router = useRouter();

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setFilters({ sortOrder: sortOrder === "ASC" ? "DESC" : "ASC" });
    } else {
      setFilters({ sortBy: key, sortOrder: "ASC" });
    }
  };

  const { user } = useAuth();

  const register = async (tournamentId: number) => {
    try {
      if (user?.playerId) {
        await tournamentService.register(tournamentId, user.playerId, "");
        console.log("Inscription au tournoi réussie !");
      } else {
        console.error("User non authentifié ou pas de playerId.");
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription au tournoi :", error);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {tableHeaders.map((header) => (
            <TableHead
              key={header.key}
              onClick={() => {
                if (header.key !== "actions") handleSort(header.key as string);
              }}
              className={`cursor-pointer select-none group ${
                header.key === "actions" ? "cursor-default" : ""
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {header.label}
                {header.key !== "actions" &&
                  sortBy === header.key &&
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
              colSpan={6}
              className="text-center py-8 text-lg animate-pulse"
            >
              Chargement des tournois...
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell
              colSpan={6}
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
                    (typeColor[tournament.type] as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                      | undefined) || "outline"
                  }
                >
                  {tournamentTypeTranslation[tournament.type]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    (statusColor[tournament.status] as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                      | undefined) || "secondary"
                  }
                >
                  {tournamentStatusTranslation[tournament.status]}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 whitespace-nowrap">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  disabled={
                    !user ||
                    tournament.status !== TournamentStatus.REGISTRATION_OPEN
                  }
                  onClick={() => register(tournament.id)}
                >
                  <UserPlus className="w-4 h-4" />
                  S&apos;inscrire
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    router.push(`/tournaments/${tournament.id}`);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Détails
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={6}
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
