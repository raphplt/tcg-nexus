"use client";

import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeService } from "@/services/badge.service";

interface UserBadgesBlockProps {
  userId: number;
}

export function UserBadgesBlock({ userId }: UserBadgesBlockProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: () => badgeService.getUserBadges(userId),
  });

  const hasBadges = !!data && data.length > 0;

  return (
    <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-yellow-500/10 rounded-lg">
          <Award className="w-5 h-5 text-yellow-500" />
        </div>
        <h2 className="text-xl font-semibold">Badges</h2>
        {data && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.length}
          </span>
        )}
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && (
        <p className="text-sm text-destructive">Erreur de chargement</p>
      )}

      {!isLoading && !isError && hasBadges && (
        <div className="space-y-3">
          {data.map((ub) => (
            <div
              key={ub.id}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-sm">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">{ub.badge.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ub.unlockedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && !hasBadges && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Award className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucun badge débloqué pour le moment
          </p>
        </div>
      )}
    </Card>
  );
}
