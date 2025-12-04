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
import { Users, Search, UserCheck } from "lucide-react";
import { Player } from "@/types/tournament";

interface TabParticipantsProps {
  participants: Player[];
}

export function TabParticipants({ participants }: TabParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = participants.filter((p) => {
    const name = p.user
      ? `${p.user.firstName} ${p.user.lastName}`
      : p.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInitials = (player: Player) => {
    if (player.user) {
      return `${player.user.firstName?.[0] || ""}${player.user.lastName?.[0] || ""}`.toUpperCase();
    }
    return player.name?.slice(0, 2)?.toUpperCase() || "??";
  };

  const getDisplayName = (player: Player) => {
    if (player.user) {
      return `${player.user.firstName} ${player.user.lastName}`;
    }
    return player.name || `Joueur #${player.id}`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{participants.length}</p>
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
                <UserCheck className="size-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {participants.filter((p) => p.user).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Comptes vérifiés
                </p>
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
                  {filteredParticipants.length}
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
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((player, index) => (
                    <TableRow
                      key={player.id}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(player)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getDisplayName(player)}
                            </p>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {player.user?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {player.user?.email || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={player.user ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {player.user ? "Vérifié" : "Invité"}
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
                      {participants.length === 0
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
