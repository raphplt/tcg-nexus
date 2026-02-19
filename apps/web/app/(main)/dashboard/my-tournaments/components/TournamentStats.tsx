import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TournamentStatsProps {
  stats: {
    total: number;
    active: number;
    finished: number;
    wins: number;
    avgRank: number;
  };
}

export function TournamentStats({ stats }: TournamentStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.active}
          </div>
          <div className="text-sm text-muted-foreground">Actifs</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.finished}
          </div>
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
  );
}
