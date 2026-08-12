import { useTranslations } from "next-intl";
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
  const t = useTranslations("MatchesTable");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>{t("round")}</TableHead>
          <TableHead className="hidden md:table-cell">{t("phase")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead className="hidden lg:table-cell">
            {t("statusScheduled")}
          </TableHead>
          <TableHead className="hidden sm:table-cell">{t("score")}</TableHead>
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
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              Aucun match planifié pour le moment.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
