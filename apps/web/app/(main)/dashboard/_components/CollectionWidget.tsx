import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Plus, TrendingUp } from "lucide-react";
import type { DashboardCollectionData } from "@/types/dashboard";

interface CollectionWidgetProps {
  data: DashboardCollectionData;
}

export function CollectionWidget({ data }: CollectionWidgetProps) {
  const isEmpty = data.totalCards === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ma collection</CardTitle>
        <Layers className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Layers className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucune carte dans vos collections
            </p>
            <Link
              href="/collection"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Commencer une collection
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.totalCards}</div>
              <p className="text-xs text-muted-foreground">
                cartes dans {data.collectionCount} collection
                {data.collectionCount > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valeur estimée</span>
              <span className="font-semibold">
                {data.estimatedValue.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
            {data.recentlyAdded > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />+{data.recentlyAdded} ces 30
                derniers jours
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
