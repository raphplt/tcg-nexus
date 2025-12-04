"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, CheckCircle } from "lucide-react";
import { TournamentRegistration } from "@/types/tournament";

interface TabParticipantsProps {
  registrations: TournamentRegistration[];
}

const statusLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  confirmed: { label: "Confirmé", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  cancelled: { label: "Annulé", variant: "destructive" },
  waitlisted: { label: "Liste d'attente", variant: "outline" },
  eliminated: { label: "Éliminé", variant: "destructive" },
};

export function TabParticipants({ registrations }: TabParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRegistrations = registrations.filter((r) => {
    const player = r.player;
    const name = player?.user
      ? `${player.user.firstName} ${player.user.lastName}`
      : player?.name || "";
    const email = player?.user?.email || "";
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
    );
  });

  const confirmedCount = registrations.filter(
    (r) => r.status === "confirmed",
  ).length;

  const getInitials = (registration: TournamentRegistration) => {
    const player = registration.player;
    if (player?.user) {
      return `${player.user.firstName?.[0] || ""}${player.user.lastName?.[0] || ""}`.toUpperCase();
    }
    return player?.name?.slice(0, 2)?.toUpperCase() || "??";
  };

  const getDisplayName = (registration: TournamentRegistration) => {
    const player = registration.player;
    if (player?.user) {
      return `${player.user.firstName} ${player.user.lastName}`;
    }
    return player?.name || `Joueur #${player?.id || "?"}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registrations.length}</p>
                <p className="text-xs text-muted-foreground">
                  Participants inscrits
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Search className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredRegistrations.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Résultats affichés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de recherche */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5 text-primary" />
            Liste des participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un participant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table des participants */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((registration, index) => (
                    <TableRow
                      key={registration.id}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(registration)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getDisplayName(registration)}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {registration.player?.user?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {registration.player?.user?.email || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            statusLabels[registration.status]?.variant ||
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {statusLabels[registration.status]?.label ||
                            registration.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-32 text-center text-muted-foreground"
                    >
                      {registrations.length === 0
                        ? "Aucun participant inscrit pour le moment."
                        : "Aucun résultat trouvé pour cette recherche."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
