// apps/web/app/(main)/users/[id]/_components/UserMarketplaceBlock.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { marketplaceService } from "@/services/marketplace.service";

interface UserMarketplaceBlockProps {
  userId: number;
}

export function UserMarketplaceBlock({ userId }: UserMarketplaceBlockProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-marketplace-stats", userId],
    queryFn: () => marketplaceService.getSellerStatistics(userId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" /> Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <Skeleton className="h-16 w-full" />}
        {isError && <p className="text-destructive">Erreur de chargement</p>}
        {data && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ventes</span>
              <span className="font-medium">{data.totalSales ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Panier moyen
              </span>
              <span className="font-medium">
                {data.avgOrderValue != null
                  ? `${data.avgOrderValue.toFixed(2)} €`
                  : "—"}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
