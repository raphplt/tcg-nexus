import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Target, Star, TrendingUp } from "lucide-react";

export const ProfileStats = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Statistiques</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">Tournois participés</span>
            <span className="font-bold text-lg">12</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">Victoires</span>
            <span className="font-bold text-lg text-green-600">8</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground">Défaites</span>
            <span className="font-bold text-lg text-red-600">4</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
            <span className="font-medium">Taux de victoire</span>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="font-bold text-green-600">66.7%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold">Récompenses</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">Champion régional</p>
              <p className="text-xs text-muted-foreground">2024</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full flex items-center justify-center shadow-sm">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium">10 victoires</p>
              <p className="text-xs text-muted-foreground">Consécutives</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
