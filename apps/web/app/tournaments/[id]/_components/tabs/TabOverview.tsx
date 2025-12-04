"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Clock,
  Target,
} from "lucide-react";
import { Tournament } from "@/types/tournament";
import { formatPricing } from "@/utils/price";
import {
  tournamentTypeTranslation,
  tournamentStatusTranslation,
} from "@/utils/tournaments";

interface TabOverviewProps {
  tournament: Tournament;
  formatDate: (date?: string | null) => string;
}

export function TabOverview({ tournament, formatDate }: TabOverviewProps) {
  const participantCount = tournament.players?.length || 0;
  const maxPlayers = tournament.maxPlayers || "∞";

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="size-5 text-primary" />À propos du tournoi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.description ? (
            <p className="text-muted-foreground leading-relaxed">
              {tournament.description}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              Aucune description fournie pour ce tournoi.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Informations clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="size-5 text-primary" />
              Dates & Horaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem
              label="Début"
              value={formatDate(tournament.startDate)}
            />
            <InfoItem
              label="Fin"
              value={formatDate(tournament.endDate)}
            />
            <InfoItem
              label="Date limite d'inscription"
              value={formatDate(tournament.registrationDeadline)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="size-5 text-primary" />
              Format & Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem
              label="Type"
              value={
                <Badge variant="secondary">
                  {tournamentTypeTranslation[
                    tournament.type as keyof typeof tournamentTypeTranslation
                  ] || tournament.type}
                </Badge>
              }
            />
            <InfoItem
              label="Statut"
              value={
                <Badge variant="outline">
                  {tournamentStatusTranslation[
                    tournament.status as keyof typeof tournamentStatusTranslation
                  ] || tournament.status}
                </Badge>
              }
            />
            <InfoItem
              label="Tours"
              value={`${tournament.currentRound || 0} / ${tournament.totalRounds || "-"}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-5 text-primary" />
              Participants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem
              label="Inscrits"
              value={
                <span className="font-semibold text-primary">
                  {participantCount} / {maxPlayers}
                </span>
              }
            />
            <InfoItem
              label="Minimum requis"
              value={tournament.minPlayers || "-"}
            />
            <InfoItem
              label="Inscriptions tardives"
              value={
                tournament.allowLateRegistration
                  ? "Autorisées"
                  : "Non autorisées"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="size-5 text-primary" />
              Lieu & Accès
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoItem
              label="Lieu"
              value={tournament.location || "Non spécifié"}
            />
            <InfoItem
              label="Visibilité"
              value={
                <Badge variant={tournament.isPublic ? "default" : "secondary"}>
                  {tournament.isPublic ? "Public" : "Privé"}
                </Badge>
              }
            />
            <InfoItem
              label="Validation requise"
              value={tournament.requiresApproval ? "Oui" : "Non"}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tarification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="size-5 text-primary" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Prix d'inscription</span>
            <span className="text-2xl font-bold text-primary">
              {formatPricing(tournament.pricing)}
            </span>
          </div>
          {tournament.pricing?.priceDescription && (
            <p className="mt-3 text-sm text-muted-foreground">
              {tournament.pricing.priceDescription}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Récompenses */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="size-5 text-primary" />
            Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.rewards && tournament.rewards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 p-4 bg-linear-to-r from-primary/5 to-primary/10 rounded-lg border"
                >
                  <div className="flex items-center justify-center size-10 rounded-full bg-primary/20 text-primary font-bold">
                    #{reward.position}
                  </div>
                  <div>
                    <p className="font-medium">{reward.name}</p>
                    {reward.description && (
                      <p className="text-xs text-muted-foreground">
                        {reward.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Aucune récompense définie pour ce tournoi.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
