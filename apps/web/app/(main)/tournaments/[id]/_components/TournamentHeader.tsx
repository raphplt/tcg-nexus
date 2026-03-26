import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1 } from "@/components/Shared/Titles";
import {
  Calendar,
  MapPin,
  Lock,
  BadgeCheck,
  Settings2,
  Trophy,
  BarChart3,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { Tournament } from "@/types/tournament";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { statusColor, typeColor } from "../../utils";

interface TournamentHeaderProps {
  tournament: Tournament;
  permissions: {
    canViewAdmin: boolean;
  };
  user: any;
  onRegister: () => void;
  formatDate: (date?: string | null) => string;
}

export function TournamentHeader({
  tournament,
  permissions,
  user,
  onRegister,
  formatDate,
}: TournamentHeaderProps) {
  const statusBadgeVariant =
    statusColor[tournament.status || ""] ?? "secondary";
  const typeBadgeVariant = typeColor[tournament.type || ""] ?? "outline";
  const registrationOpen = tournament.status === "registration_open";

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={statusBadgeVariant} className="capitalize">
          {tournamentStatusTranslation[
            tournament.status as keyof typeof tournamentStatusTranslation
          ] || tournament.status}
        </Badge>
        <Badge variant={typeBadgeVariant} className="capitalize">
          {tournamentTypeTranslation[
            tournament.type as keyof typeof tournamentTypeTranslation
          ] || tournament.type}
        </Badge>
        {tournament.isPublic === false ? (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" /> Privé
          </Badge>
        ) : (
          <Badge variant="outline">Public</Badge>
        )}
        {tournament.requiresApproval && (
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="size-3" /> Validation requise
          </Badge>
        )}
      </div>

      <H1 className="text-balance">{tournament.name}</H1>

      <p className="text-muted-foreground flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-4" /> {formatDate(tournament.startDate)} –{" "}
          {formatDate(tournament.endDate)}
        </span>
        {tournament.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" /> {tournament.location}
          </span>
        )}
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          disabled={!registrationOpen || !user}
          className="shadow-md"
          onClick={onRegister}
        >
          {registrationOpen ? "S'inscrire" : "Inscriptions fermées"}
        </Button>

        {permissions.canViewAdmin && (
          <Button variant="outline" className="shadow-md" asChild>
            <Link href={`/tournaments/${tournament.id}/admin`}>
              <Settings2 className="size-4 mr-2" /> Administration
            </Link>
          </Button>
        )}

        {tournament.status === "in_progress" && (
          <Button variant="secondary" className="shadow-md" asChild>
            <Link href={`/tournaments/${tournament.id}/bracket`}>
              <Trophy className="size-4 mr-2" /> Voir le bracket
            </Link>
          </Button>
        )}

        {user?.player &&
          (tournament.status === "in_progress" ||
            tournament.status === "finished") && (
            <Button variant="outline" className="shadow-md" asChild>
              <Link href={`/tournaments/${tournament.id}/player`}>
                <BarChart3 className="size-4 mr-2" /> Mon dashboard
              </Link>
            </Button>
          )}

        <Button variant="secondary" className="shadow-md" aria-label="Règlement">
          <ListChecks className="size-4 mr-2" /> Règlement
        </Button>
      </div>
    </header>
  );
}
