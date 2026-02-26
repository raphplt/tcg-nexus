import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Plus } from "lucide-react";
import type { DashboardTournamentsData } from "@/types/dashboard";

interface TournamentsWidgetProps {
  data: DashboardTournamentsData;
}

export function TournamentsWidget({ data }: TournamentsWidgetProps) {
  const isEmpty = data.played === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Mes tournois</CardTitle>
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore participé à un tournoi
            </p>
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Voir les tournois
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.played}</div>
              <p className="text-xs text-muted-foreground">
                tournoi{data.played > 1 ? "s" : ""} joué
                {data.played > 1 ? "s" : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Winrate</span>
                <div className="font-semibold">{data.winRate}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Meilleur rang</span>
                <div className="font-semibold">
                  {data.bestRank !== null ? `#${data.bestRank}` : "-"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="text-green-600 font-medium">
                {data.totalWins}V
              </span>
              <span className="text-red-500 font-medium">
                {data.totalLosses}D
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
