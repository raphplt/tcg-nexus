import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Dashboard.myTournaments.stats");
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-muted-foreground">{t("total")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.active}
          </div>
          <div className="text-sm text-muted-foreground">{t("active")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.finished}
          </div>
          <div className="text-sm text-muted-foreground">{t("finished")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.wins}</div>
          <div className="text-sm text-muted-foreground">{t("wins")}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.avgRank > 0 ? stats.avgRank.toFixed(1) : "-"}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("averageRank")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
