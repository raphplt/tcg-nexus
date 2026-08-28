import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  cardsCount?: number;
  hasFilterBar?: boolean;
}

/**
 * Reusable full-page skeleton loader with header, optional filter bar, and responsive grid placeholders.
 */
export function PageSkeleton({
  cardsCount = 8,
  hasFilterBar = true,
}: PageSkeletonProps) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in-50 duration-300">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 md:w-80 rounded-lg bg-muted/60" />
        <Skeleton className="h-5 w-96 max-w-full rounded-md bg-muted/40" />
      </div>

      {/* Filter and Search Bar Skeleton */}
      {hasFilterBar && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center py-2">
          <Skeleton className="h-10 w-full sm:w-80 rounded-lg bg-muted/50" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg bg-muted/40" />
            <Skeleton className="h-10 w-28 rounded-lg bg-muted/40" />
          </div>
        </div>
      )}

      {/* Responsive Grid of Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: cardsCount }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/40 p-4 space-y-4 bg-card/40 backdrop-blur-sm"
          >
            <Skeleton className="aspect-[3/4] w-full rounded-lg bg-muted/60" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4 rounded-md bg-muted/50" />
              <Skeleton className="h-4 w-1/2 rounded-md bg-muted/40" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-20 rounded-md bg-muted/40" />
              <Skeleton className="h-8 w-24 rounded-lg bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
