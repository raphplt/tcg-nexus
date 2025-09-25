"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Filter,
  Search,
  Play,
  Clock,
  CheckCircle,
  X,
  Trophy,
  Eye,
  RotateCcw,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useTournament } from "@/hooks/useTournament";
import { useMatches } from "@/hooks/useMatches";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MatchesPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { tournament } = useTournament(id as string);
  const { matches, stats, isLoading, startMatch, resetMatch } = useMatches(id as string);
  const permissions = usePermissions(user, tournament);

  const [filters, setFilters] = useState({
    round: "",
    status: "",
    player: "",
    search: "",
  });

  const filteredMatches = matches.filter((match) => {
    if (filters.round && match.round.toString() !== filters.round) return false;
    if (filters.status && match.status !== filters.status) return false;
    if (filters.player) {
      const playerId = parseInt(filters.player);
      if (match.playerA?.id !== playerId && match.playerB?.id !== playerId) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const playerAName = match.playerA?.name?.toLowerCase() || "";
      const playerBName = match.playerB?.name?.toLowerCase() || "";
      if (!playerAName.includes(searchLower) && !playerBName.includes(searchLower)) return false;
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "in_progress":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "finished":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "forfeit":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">Programmé</Badge>;
      case "in_progress":
        return <Badge variant="secondary">En cours</Badge>;
      case "finished":
        return <Badge variant="default">Terminé</Badge>;
      case "forfeit":
        return <Badge variant="destructive">Forfait</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "final":
        return "Finale";
      case "semi_final":
        return "Demi-finale";
      case "quarter_final":
        return "Quart de finale";
      default:
        return "Qualification";
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const rounds = tournament?.totalRounds ? Array.from({ length: tournament.totalRounds }, (_, i) => i + 1) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/tournaments/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au tournoi
            </Link>
          </Button>

          <div className="flex-1">
            <H1 className="mb-2">Matches - {tournament?.name}</H1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{matches.length} matches au total</span>
              <span>{stats.finished} terminés</span>
              <span>{stats.inProgress} en cours</span>
              <span>{stats.scheduled} programmés</span>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href={`/tournaments/${id}/bracket`}>
              <Trophy className="w-4 h-4 mr-2" />
              Voir le bracket
            </Link>
          </Button>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.finished}</div>
              <div className="text-sm text-muted-foreground">Terminés</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">En cours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.scheduled}</div>
              <div className="text-sm text-muted-foreground">Programmés</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nom du joueur..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="round">Round</Label>
                <Select value={filters.round} onValueChange={(value) => setFilters({ ...filters, round: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les rounds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les rounds</SelectItem>
                    {rounds.map((round) => (
                      <SelectItem key={round} value={round.toString()}>
                        Round {round}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les statuts</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="finished">Terminé</SelectItem>
                    <SelectItem value="forfeit">Forfait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ round: "", status: "", player: "", search: "" })}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des matches */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Joueurs</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.length > 0 ? (
                  filteredMatches.map((match) => (
                    <TableRow
                      key={match.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/tournaments/${id}/matches/${match.id}`)}
                    >
                      <TableCell className="font-medium">#{match.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Round {match.round}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getPhaseLabel(match.phase)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {match.playerA?.name[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{match.playerA?.name || "TBD"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {match.playerB?.name[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{match.playerB?.name || "TBD"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {match.status === "finished" || match.status === "forfeit" ? (
                          <span className="font-medium">
                            {match.playerAScore} - {match.playerBScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(match.status)}
                          {getStatusBadge(match.status)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(match.scheduledDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/tournaments/${id}/matches/${match.id}`}>
                              <Eye className="w-3 h-3" />
                            </Link>
                          </Button>
                          
                          {permissions.canStartMatches && match.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startMatch(match.id)}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {permissions.canResetMatches && (match.status === "finished" || match.status === "forfeit") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const reason = prompt("Raison du reset :");
                                if (reason) resetMatch(match.id, { reason });
                              }}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Aucun match trouvé avec ces filtres</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Actions rapides pour les organisateurs */}
        {permissions.canStartMatches && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const scheduledMatches = matches.filter(m => m.status === "scheduled");
                    scheduledMatches.forEach(match => startMatch(match.id));
                  }}
                  disabled={stats.scheduled === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Démarrer tous les matches programmés ({stats.scheduled})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
