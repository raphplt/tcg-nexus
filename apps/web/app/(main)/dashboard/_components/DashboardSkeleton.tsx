import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-[200px] pt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <Skeleton
                className="w-full rounded-t"
                style={{ height: `${30 + Math.random() * 120}px` }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
      <ChartSkeleton />
    </div>
  );
}
