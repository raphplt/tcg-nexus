import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, TrendingUp, Award } from "lucide-react";
import type {
  DashboardTournamentsData,
  DashboardBadgesData,
  DashboardBadgeItem,
} from "@/types/dashboard";

interface ProfileStatsProps {
  tournaments?: DashboardTournamentsData;
  badges?: DashboardBadgesData;
}

export const ProfileStats = ({ tournaments, badges }: ProfileStatsProps) => {
  const hasTournamentData = tournaments && tournaments.played > 0;
  const hasBadges = badges && badges.unlocked.length > 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Statistiques</h2>
        </div>

        {hasTournamentData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">Tournois participés</span>
              <span className="font-bold text-lg">{tournaments.played}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">Victoires</span>
              <span className="font-bold text-lg text-green-600">
                {tournaments.totalWins}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-muted-foreground">Défaites</span>
              <span className="font-bold text-lg text-red-600">
                {tournaments.totalLosses}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="font-medium">Taux de victoire</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-600">
                  {tournaments.winRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {tournaments.bestRank && (
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground">Meilleur classement</span>
                <span className="font-bold text-lg">#{tournaments.bestRank}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucun tournoi joué pour le moment
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Award className="w-5 h-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">Badges</h2>
          {badges && (
            <span className="text-xs text-muted-foreground ml-auto">
              {badges.unlocked.length}/{badges.total}
            </span>
          )}
        </div>

        {hasBadges ? (
          <div className="space-y-3">
            {badges.unlocked.map((badge: DashboardBadgeItem) => (
              <div
                key={badge.code}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(badge.unlockedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Award className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucun badge débloqué pour le moment
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
