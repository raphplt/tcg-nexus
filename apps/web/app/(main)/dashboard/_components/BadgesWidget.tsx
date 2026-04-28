import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Sparkles,
  Layers,
  Crown,
  SquareStack,
  Hammer,
  Swords,
  Trophy,
  Medal,
  Tag,
  Store,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { DashboardBadgesData } from "@/types/dashboard";

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  layers: Layers,
  crown: Crown,
  "square-stack": SquareStack,
  hammer: Hammer,
  swords: Swords,
  trophy: Trophy,
  medal: Medal,
  tag: Tag,
  store: Store,
  "shopping-bag": ShoppingBag,
  library: Layers,
};

interface BadgesWidgetProps {
  data: DashboardBadgesData;
}

export function BadgesWidget({ data }: BadgesWidgetProps) {
  const isEmpty = data.unlocked.length === 0 && !data.nextBadge;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Badges</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {data.unlocked.length}/{data.total}
          </span>
          <Award className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Award className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Commencez à utiliser la plateforme pour débloquer des badges
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.unlocked.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.unlocked.slice(0, 6).map((badge) => {
                  const IconComp = ICON_MAP[badge.icon] ?? Award;
                  return (
                    <div
                      key={badge.code}
                      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      title={badge.name}
                    >
                      <IconComp className="h-3 w-3" />
                      {badge.name}
                    </div>
                  );
                })}
                {data.unlocked.length > 6 && (
                  <div className="flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    +{data.unlocked.length - 6}
                  </div>
                )}
              </div>
            )}

            {data.nextBadge && (
              <div className="rounded-md bg-muted/50 p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const IconComp = ICON_MAP[data.nextBadge.icon] ?? Award;
                      return (
                        <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                      );
                    })()}
                    <span className="text-xs font-medium">
                      {data.nextBadge.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {data.nextBadge.current}/{data.nextBadge.threshold}
                  </span>
                </div>
                <Progress value={data.nextBadge.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {data.nextBadge.description}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
