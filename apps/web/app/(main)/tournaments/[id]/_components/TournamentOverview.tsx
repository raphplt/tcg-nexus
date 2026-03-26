import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Trophy } from "lucide-react";
import { Tournament } from "@/types/tournament";

interface TournamentOverviewProps {
  tournament: Tournament;
  headerSubtitle: string;
  formatDate: (date?: string | null) => string;
}

export function TournamentOverview({
  tournament,
  headerSubtitle,
  formatDate,
}: TournamentOverviewProps) {
  return (
    <section
      id="aperçu"
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5" /> Aperçu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tournament.description ? (
            <p className="leading-relaxed text-sm md:text-base">
              {tournament.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aucune description fournie.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow
              label="Période"
              value={headerSubtitle}
            />
            <InfoRow
              label="Lieu"
              value={tournament.location || "-"}
            />
            <InfoRow
              label="Tour actuel"
              value={`${tournament.currentRound ?? 0}/${tournament.totalRounds ?? 0}`}
            />
            <InfoRow
              label="Date limite d'inscription"
              value={formatDate(tournament.registrationDeadline ?? null)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5" /> Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tournament.rewards && tournament.rewards.length > 0 ? (
            <ul className="space-y-2">
              {tournament.rewards.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">#{r.position}</span>
                  <span className="font-medium">{r.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pas de récompenses définies.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
