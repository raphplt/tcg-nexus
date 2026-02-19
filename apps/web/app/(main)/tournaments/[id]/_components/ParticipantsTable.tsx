import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Player } from "@/types/tournament";

interface ParticipantsTableProps {
  participants: Player[];
}

export function ParticipantsTable({ participants }: ParticipantsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Joueur</TableHead>
          <TableHead className="hidden sm:table-cell">ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.length > 0 ? (
          participants.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {(p.user
                        ? `${p.user.firstName} ${p.user.lastName}`
                        : p.name
                      )
                        ?.slice(0, 2)
                        ?.toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {p.user
                        ? `${p.user.firstName} ${p.user.lastName}`
                        : p.name || `Joueur #${p.id}`}
                    </span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      #{p.id}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">#{p.id}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={2}
              className="text-center text-muted-foreground"
            >
              Aucun participant pour le moment.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
