"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  className,
}: ViewToggleProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant={viewMode === "grid" ? "default" : "outline"}
        size="icon"
        className="h-9 w-9"
        onClick={() => onViewModeChange("grid")}
        aria-label="Vue grille"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "outline"}
        size="icon"
        className="h-9 w-9"
        onClick={() => onViewModeChange("list")}
        aria-label="Vue liste"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
