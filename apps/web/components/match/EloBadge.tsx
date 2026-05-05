"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { rankingService } from "@/services/ranking.service";

interface EloBadgeProps {
  className?: string;
  variant?: "outline" | "secondary" | "default";
  showLabel?: boolean;
}

export function EloBadge({
  className,
  variant = "outline",
  showLabel = true,
}: EloBadgeProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["ranking", "elo", "me"],
    queryFn: () => rankingService.getMyElo(),
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <Badge variant={variant} className={className}>
        <Trophy className="mr-1 h-3 w-3" />
        {showLabel ? "ELO ..." : "..."}
      </Badge>
    );
  }

  return (
    <Badge variant={variant} className={className}>
      <Trophy className="mr-1 h-3 w-3" />
      {showLabel ? `ELO ${data.elo}` : data.elo}
    </Badge>
  );
}
