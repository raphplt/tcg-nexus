"use client";

import {
  BadgeCheck,
  Calendar,
  Clock3,
  Loader2,
  Lock,
  MapPin,
  Settings2,
  Swords,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tournament } from "@/types/tournament";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";

interface TournamentHeroBannerProps {
  tournament: Tournament;
  permissions: {
    canViewAdmin: boolean;
  };
  user: any;
  onRegister: () => Promise<void>;
  onUnregister: () => Promise<void>;
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
  onUnregister,
  formatDate,
}: TournamentHeroBannerProps) {
  const t = useTranslations("TournamentHero");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const [showUnregisterDialog, setShowUnregisterDialog] = useState(false);
  const registrationOpen = tournament.status === "registration_open";
  const registrationClosed = tournament.status === "registration_closed";
  const statusColor =
    statusColorMap[tournament.status || ""] ?? "bg-muted text-muted-foreground";

  const confirmedRegistrations =
    tournament.registrations?.filter(
      (registration) => registration.status === "confirmed",
    ) || [];
  const participantCount =
    confirmedRegistrations.length || tournament.players?.length || 0;
  const waitlistedCount =
    tournament.registrations?.filter(
      (registration) => registration.status === "waitlisted",
    ).length || 0;
  const maxPlayers = tournament.maxPlayers || "∞";
  const matchesCount = tournament.matches?.length || 0;

  const currentRegistration = tournament.registrations?.find(
    (registration) =>
      registration.player?.id === user?.player?.id &&
      registration.status !== "cancelled",
  );
  const tournamentIsFull = Boolean(
    tournament.maxPlayers && participantCount >= tournament.maxPlayers,
  );

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      await onRegister();
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    setIsUnregistering(true);
    try {
      await onUnregister();
      setShowUnregisterDialog(false);
    } catch {
      // Le parent affiche le message d'erreur et la confirmation reste ouverte.
    } finally {
      setIsUnregistering(false);
    }
  };

  return (
    <>
      <div className="panel-hero relative overflow-hidden">
        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className={`${statusColor} font-medium`}>
              {tournamentStatusTranslation[
                tournament.status as keyof typeof tournamentStatusTranslation
              ] || tournament.status}
            </Badge>
            <Badge variant="secondary">
              {tournamentTypeTranslation[
                tournament.type as keyof typeof tournamentTypeTranslation
              ] || tournament.type}
            </Badge>
            {tournament.isExternal && (
              <Badge
                variant="secondary"
                className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium"
              >
                Tournoi Externe
              </Badge>
            )}
            {tournament.isPublic === false ? (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" />
                {t("private")}
              </Badge>
            ) : (
              <Badge variant="outline">{t("public")}</Badge>
            )}
            {tournament.requiresApproval && (
              <Badge variant="outline" className="gap-1">
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
                disabled={
                  ((!registrationOpen || !user || !!currentRegistration) &&
                    !tournament.isExternal) ||
                  isRegistering
                }
                onClick={
                  tournament.isExternal
                    ? () => {
                        let url = tournament.externalRegistrationUrl || "";
                        if (url && !/^https?:\/\//i.test(url)) {
                          url = `https://${url}`;
                        }
                        window.open(url, "_blank");
                      }
                    : handleRegister
                }
              >
                {isRegistering ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : currentRegistration?.status === "waitlisted" ? (
                  <Clock3 className="size-4 mr-2" />
                ) : currentRegistration ? (
                  <UserCheck className="size-4 mr-2" />
                ) : null}
                {tournament.isExternal
                  ? "S'inscrire (Externe)"
                  : currentRegistration?.status === "confirmed"
                    ? t("registrationConfirmed")
                    : currentRegistration?.status === "pending"
                      ? "Validation en attente"
                      : currentRegistration?.status === "waitlisted"
                        ? t("onWaitlist")
                        : registrationOpen
                          ? tournamentIsFull
                            ? t("joinWaitlist")
                            : t("register")
                          : t("registrationsClosed")}
              </Button>

              {!tournament.isExternal &&
                currentRegistration &&
                (registrationOpen || registrationClosed) && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowUnregisterDialog(true)}
                    disabled={isUnregistering}
                  >
                    <UserMinus className="size-4 mr-2" />
                    {t("unregister")}
                  </Button>
                )}

              {permissions.canViewAdmin && (
                <Button variant="outline" size="lg" asChild>
                  <Link href={`/tournaments/${tournament.id}/admin`}>
                    <Settings2 className="size-4 mr-2" />
                    Administration
                  </Link>
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
            <Card className="surface-muted">
              <CardContent className="p-3 text-center">
                <Users className="size-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{participantCount}</p>
                <p className="text-xs text-muted-foreground">
                  Participants / {maxPlayers}
                </p>
              </CardContent>
            </Card>
            <Card className="surface-muted">
              <CardContent className="p-3 text-center">
                <Clock3 className="size-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{waitlistedCount}</p>
                <p className="text-xs text-muted-foreground">{t("waitlist")}</p>
              </CardContent>
            </Card>
            <Card className="surface-muted">
              <CardContent className="p-3 text-center">
                <Swords className="size-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{matchesCount}</p>
                <p className="text-xs text-muted-foreground">{t("matches")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog
        open={showUnregisterDialog}
        onOpenChange={setShowUnregisterDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unregisterWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnregistering}>
              {t("keepRegistration")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleUnregister();
              }}
              disabled={isUnregistering}
            >
              {isUnregistering && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              Confirmer la désinscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
