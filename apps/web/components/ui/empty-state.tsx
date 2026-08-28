import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Clean and modern EmptyState component used across catalogs, decks, listings, and tournaments.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/20 backdrop-blur-sm my-6 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-4 text-muted-foreground shadow-sm">
        <Icon className="w-8 h-8 text-primary/80" />
      </div>
      <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild className="shadow-md">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && !actionHref && onAction && (
        <Button onClick={onAction} className="shadow-md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
