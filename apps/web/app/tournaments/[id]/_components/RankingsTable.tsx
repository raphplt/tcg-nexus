import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ranking } from "@/types/tournament";

interface RankingsTableProps {
  rankings: Ranking[];
}

export function RankingsTable({ rankings }: RankingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rang</TableHead>
          <TableHead>Points</TableHead>
          <TableHead className="hidden sm:table-cell">V</TableHead>
          <TableHead className="hidden sm:table-cell">D</TableHead>
          <TableHead className="hidden sm:table-cell">N</TableHead>
          <TableHead className="hidden md:table-cell">% Victoires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rankings.length > 0 ? (
          rankings.map((r) => (
            <TableRow key={r.id}>
              <TableCell>#{r.rank}</TableCell>
              <TableCell className="font-medium">{r.points}</TableCell>
              <TableCell className="hidden sm:table-cell">{r.wins}</TableCell>
              <TableCell className="hidden sm:table-cell">{r.losses}</TableCell>
              <TableCell className="hidden sm:table-cell">{r.draws}</TableCell>
              <TableCell className="hidden md:table-cell">
                {r.winRate ?? "0.00"}%
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Le classement n&apos;est pas encore disponible.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
