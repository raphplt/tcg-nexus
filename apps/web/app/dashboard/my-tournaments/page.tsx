"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  BarChart3,
  Eye,
  Clock,
  CheckCircle,
  X,
  Target,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { useAuth } from "@/contexts/AuthContext";
import { tournamentService } from "@/services/tournament.service";
import { Tournament } from "@/types/tournament";
import Link from "next/link";

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  // Récupérer les tournois du joueur
  const {
    data: playerTournaments = [],
    isLoading,
    error,
  } = useQuery<Tournament[]>({
    queryKey: ["player", user?.player?.id, "tournaments"],
    queryFn: () => {
      if (!user?.player?.id) return [];
      // Note: Cette méthode doit être ajoutée au backend
      return tournamentService.getPlayerTournaments(user.player.id);
    },
    enabled: !!user?.player?.id,
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline" as const, label: "Brouillon" },
      registration_open: { variant: "secondary" as const, label: "Inscriptions ouvertes" },
      registration_closed: { variant: "outline" as const, label: "Inscriptions fermées" },
      in_progress: { variant: "default" as const, label: "En cours" },
      finished: { variant: "secondary" as const, label: "Terminé" },
      cancelled: { variant: "destructive" as const, label: "Annulé" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "single_elimination":
        return <Target className="w-4 h-4" />;
      case "double_elimination":
        return <Trophy className="w-4 h-4" />;
      case "swiss_system":
        return <BarChart3 className="w-4 h-4" />;
      case "round_robin":
        return <Users className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  // Séparer les tournois par statut
  const activeTournaments = playerTournaments.filter(t => 
    t.status === "registration_open" || t.status === "registration_closed" || t.status === "in_progress"
  );
  
  const finishedTournaments = playerTournaments.filter(t => 
    t.status === "finished"
  );
  
  const cancelledTournaments = playerTournaments.filter(t => 
    t.status === "cancelled"
  );

  // Statistiques globales
  const stats = {
    total: playerTournaments.length,
    active: activeTournaments.length,
    finished: finishedTournaments.length,
    wins: finishedTournaments.filter(t => {
      // Vérifier si le joueur a gagné (rang 1)
      const playerRanking = t.rankings?.find(r => r.player.id === user?.player?.id);
      return playerRanking?.rank === 1;
    }).length,
    avgRank: finishedTournaments.length > 0 ? 
      finishedTournaments.reduce((sum, t) => {
        const ranking = t.rankings?.find(r => r.player.id === user?.player?.id);
        return sum + (ranking?.rank || 999);
      }, 0) / finishedTournaments.length : 0,
  };

  if (!user?.player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Profil joueur requis</h1>
          <p className="text-muted-foreground mb-4">
            Vous devez avoir un profil joueur pour voir vos tournois.
          </p>
          <Button asChild>
            <Link href="/tournaments">Découvrir les tournois</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <H1 className="mb-2">Mes Tournois</H1>
            <p className="text-muted-foreground">
              Suivi de toutes vos participations
            </p>
          </div>
          
          <Button asChild>
            <Link href="/tournaments">
              <Trophy className="w-4 h-4 mr-2" />
              Découvrir des tournois
            </Link>
          </Button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Actifs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.finished}</div>
              <div className="text-sm text-muted-foreground">Terminés</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.wins}</div>
              <div className="text-sm text-muted-foreground">Victoires</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.avgRank > 0 ? stats.avgRank.toFixed(1) : "-"}
              </div>
              <div className="text-sm text-muted-foreground">Rang moyen</div>
            </CardContent>
          </Card>
        </div>

        {/* Onglets par statut */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Actifs ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Terminés ({stats.finished})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Annulés ({cancelledTournaments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <TournamentsList 
              tournaments={activeTournaments}
              isLoading={isLoading}
              showRanking={false}
            />
          </TabsContent>

          <TabsContent value="finished" className="mt-6">
            <TournamentsList 
              tournaments={finishedTournaments}
              isLoading={isLoading}
              showRanking={true}
              userId={user.player.id}
            />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <TournamentsList 
              tournaments={cancelledTournaments}
              isLoading={isLoading}
              showRanking={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface TournamentsListProps {
  tournaments: Tournament[];
  isLoading: boolean;
  showRanking?: boolean;
  userId?: number;
}

function TournamentsList({ tournaments, isLoading, showRanking = false, userId }: TournamentsListProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun tournoi dans cette catégorie</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "single_elimination":
        return <Target className="w-4 h-4" />;
      case "double_elimination":
        return <Trophy className="w-4 h-4" />;
      case "swiss_system":
        return <BarChart3 className="w-4 h-4" />;
      case "round_robin":
        return <Users className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "outline" as const, label: "Brouillon" },
      registration_open: { variant: "secondary" as const, label: "Inscriptions ouvertes" },
      registration_closed: { variant: "outline" as const, label: "Inscriptions fermées" },
      in_progress: { variant: "default" as const, label: "En cours" },
      finished: { variant: "secondary" as const, label: "Terminé" },
      cancelled: { variant: "destructive" as const, label: "Annulé" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => {
        const playerRanking = showRanking && userId ? 
          tournament.rankings?.find(r => r.player.id === userId) : null;

        return (
          <Card key={tournament.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(tournament.type)}
                    <h3 className="text-xl font-bold">{tournament.name}</h3>
                    {getStatusBadge(tournament.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(tournament.startDate)}
                    </span>
                    {tournament.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {tournament.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tournament.players?.length || 0} joueurs
                    </span>
                  </div>

                  {/* Résultat du joueur */}
                  {showRanking && playerRanking && (
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">Rang #{playerRanking.rank}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <span>{playerRanking.points} points</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span>{playerRanking.winRate.toFixed(1)}% victoires</span>
                      </div>
                    </div>
                  )}

                  {tournament.description && (
                    <p className="text-sm text-muted-foreground">{tournament.description}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tournaments/${tournament.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir
                    </Link>
                  </Button>
                  
                  {tournament.status === "in_progress" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tournaments/${tournament.id}/player`}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  
                  {(tournament.status === "in_progress" || tournament.status === "finished") && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tournaments/${tournament.id}/bracket`}>
                        <Trophy className="w-4 h-4 mr-2" />
                        Bracket
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
