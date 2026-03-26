"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Lock,
  BadgeCheck,
  Users,
  Trophy,
  Swords,
  Settings2,
  UserPlus,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Tournament } from "@/types/tournament";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserRole } from "@/types/auth";
import { tournamentService } from "@/services/tournament.service";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

interface TournamentHeroBannerProps {
  tournament: Tournament;
  permissions: {
    canViewAdmin: boolean;
  };
  user: any;
  onRegister: () => void;
  formatDate: (date?: string | null) => string;
}

const statusColorMap: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  registration_open: "bg-green-500/10 text-green-500 border-green-500/20",
  registration_closed: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  finished: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function TournamentHeroBanner({
  tournament,
  permissions,
  user,
  onRegister,
  formatDate,
}: TournamentHeroBannerProps) {
  const [isFillingPlayers, setIsFillingPlayers] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const queryClient = useQueryClient();
  const registrationOpen = tournament.status === "registration_open";
  const registrationClosed = tournament.status === "registration_closed";
  const statusColor =
    statusColorMap[tournament.status || ""] ?? "bg-muted text-muted-foreground";

  const participantCount =
    tournament.registrations?.length || tournament.players?.length || 0;
  const maxPlayers = tournament.maxPlayers || "∞";
  const matchesCount = tournament.matches?.length || 0;

  const isAdmin = user?.role === UserRole.ADMIN;

  const handleFillWithPlayers = async () => {
    if (!tournament?.id) return;
    setIsFillingPlayers(true);
    try {
      await tournamentService.fillWithPlayers(tournament.id, 8);
      toast.success("8 joueurs inscrits avec succès !");
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournament.id.toString()],
      });
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'inscription des joueurs");
    } finally {
      setIsFillingPlayers(false);
    }
  };

  const handleCheckInAll = async () => {
    if (!tournament?.id) return;
    setIsCheckingIn(true);
    try {
      const result = await tournamentService.checkInAllPlayers(tournament.id);
      toast.success(
        `${result.checkedInCount} joueurs ont fait leur check-in !`,
      );
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournament.id.toString()],
      });
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors du check-in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-background to-secondary/10 border">
      <div className="absolute inset-0 bg-grid-white/5 mask-[linear-gradient(0deg,transparent,black)]" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Badge
            variant="outline"
            className={`${statusColor} font-medium`}
          >
            {tournamentStatusTranslation[
              tournament.status as keyof typeof tournamentStatusTranslation
            ] || tournament.status}
          </Badge>
          <Badge variant="secondary">
            {tournamentTypeTranslation[
              tournament.type as keyof typeof tournamentTypeTranslation
            ] || tournament.type}
          </Badge>
          {tournament.isPublic === false ? (
            <Badge
              variant="outline"
              className="gap-1"
            >
              <Lock className="size-3" /> Privé
            </Badge>
          ) : (
            <Badge variant="outline">Public</Badge>
          )}
          {tournament.requiresApproval && (
            <Badge
              variant="outline"
              className="gap-1"
            >
              <BadgeCheck className="size-3" /> Validation requise
            </Badge>
          )}
        </div>

        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            {tournament.name}
          </h1>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              disabled={!registrationOpen || !user}
              onClick={onRegister}
              className="shadow-lg"
            >
              {registrationOpen
                ? "S'inscrire au tournoi"
                : "Inscriptions fermées"}
            </Button>

            {permissions.canViewAdmin && (
              <Button
                variant="outline"
                size="lg"
                asChild
              >
                <Link href={`/tournaments/${tournament.id}/admin`}>
                  <Settings2 className="size-4 mr-2" />
                  Administration
                </Link>
              </Button>
            )}

            {/* Bouton admin pour remplir avec 8 joueurs */}
            {isAdmin && registrationOpen && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleFillWithPlayers}
                disabled={isFillingPlayers}
                className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                {isFillingPlayers ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="size-4 mr-2" />
                )}
                Remplir (8 joueurs)
              </Button>
            )}

            {isAdmin &&
              (registrationOpen || registrationClosed) &&
              participantCount > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleCheckInAll}
                  disabled={isCheckingIn}
                  className="border-green-500/30 text-green-600 hover:bg-green-500/10"
                >
                  {isCheckingIn ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="size-4 mr-2" />
                  )}
                  Check-in global
                </Button>
              )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" />
            {formatDate(tournament.startDate)} –{" "}
            {formatDate(tournament.endDate)}
          </span>
          {tournament.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {tournament.location}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
          <Card className="bg-background/50 backdrop-blur">
            <CardContent className="p-3 text-center">
              <Users className="size-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{participantCount}</p>
              <p className="text-xs text-muted-foreground">/ {maxPlayers}</p>
            </CardContent>
          </Card>
          <Card className="bg-background/50 backdrop-blur">
            <CardContent className="p-3 text-center">
              <Swords className="size-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{matchesCount}</p>
              <p className="text-xs text-muted-foreground">matches</p>
            </CardContent>
          </Card>
          <Card className="bg-background/50 backdrop-blur">
            <CardContent className="p-3 text-center">
              <Trophy className="size-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">
                {tournament.currentRound || 0}/{tournament.totalRounds || "-"}
              </p>
              <p className="text-xs text-muted-foreground">rounds</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
