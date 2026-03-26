import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Trophy, Settings2, Info } from "lucide-react";
import { tournamentTypeTranslation, tournamentStatusTranslation } from "@/utils/tournaments";

interface TournamentStatsProps {
  participantCount: number;
  matchesCount: number;
  tournamentType: string;
  tournamentStatus: string;
}

export function TournamentStats({
  participantCount,
  matchesCount,
  tournamentType,
  tournamentStatus,
}: TournamentStatsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="size-5" />}
        label="Participants"
        value={participantCount}
      />
      <StatCard
        icon={<Trophy className="size-5" />}
        label="Matches"
        value={matchesCount}
      />
      <StatCard
        icon={<Settings2 className="size-5" />}
        label="Format"
        value={
          tournamentTypeTranslation[
            tournamentType as keyof typeof tournamentTypeTranslation
          ] || tournamentType
        }
      />
      <StatCard
        icon={<Info className="size-5" />}
        label="Statut"
        value={
          tournamentStatusTranslation[
            tournamentStatus as keyof typeof tournamentStatusTranslation
          ] || tournamentStatus
        }
      />
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
          <div className="bg-primary/10 text-primary rounded-md p-2 shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
