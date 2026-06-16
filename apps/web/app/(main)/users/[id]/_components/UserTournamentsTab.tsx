// apps/web/app/(main)/users/[id]/_components/UserTournamentsTab.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import { playerService } from "@/services/player.service";

interface UserTournamentsTabProps {
  playerId: number | undefined;
}

export function UserTournamentsTab({ playerId }: UserTournamentsTabProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-public-tournaments", playerId],
    queryFn: () => playerService.getTournamentHistory(playerId!, "all"),
    enabled: !!playerId,
  });

  if (!playerId) {
    return <p className="text-sm text-muted-foreground">Aucun tournoi</p>;
  }
  if (isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">Erreur de chargement</p>;
  }
  const history = data?.history ?? [];
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun tournoi</p>;
  }
  return (
    <ul className="grid gap-3">
      {history.map((item) => {
        const totalMatches = item.wins + item.losses + item.draws;
        return (
          <li key={item.tournament.id}>
            <Card className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{item.tournament.name}</p>
                <p className="text-xs text-muted-foreground">
                  {totalMatches} match(s)
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-sm">
                <Trophy className="h-4 w-4" />
                {item.rank ? `${item.rank}e place` : "—"}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
