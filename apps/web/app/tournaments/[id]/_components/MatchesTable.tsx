import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Match } from "@/types/tournament";

interface MatchesTableProps {
  matches: Match[];
  formatDate: (date?: string | null) => string;
}

export function MatchesTable({ matches, formatDate }: MatchesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Round</TableHead>
          <TableHead className="hidden md:table-cell">Phase</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="hidden lg:table-cell">Planifié</TableHead>
          <TableHead className="hidden sm:table-cell">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.length > 0 ? (
          matches.map((m) => (
            <TableRow key={m.id}>
              <TableCell>#{m.id}</TableCell>
              <TableCell>{m.round}</TableCell>
              <TableCell className="hidden md:table-cell capitalize">
                {m.phase || "-"}
              </TableCell>
              <TableCell className="capitalize">{m.status}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {formatDate(m.scheduledDate ?? null)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {(m.playerAScore ?? 0) + " - " + (m.playerBScore ?? 0)}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Aucun match planifié pour le moment.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
