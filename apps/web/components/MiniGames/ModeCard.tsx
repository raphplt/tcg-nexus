"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ModeAccent = "neutral" | "blue" | "purple" | "amber";

const ACCENTS: Record<ModeAccent, { icon: string; button: string }> = {
  neutral: {
    icon: "bg-muted text-foreground",
    button: "",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    button: "bg-blue-500 text-white hover:bg-blue-600",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    button: "bg-purple-500 text-white hover:bg-purple-600",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-500",
    button: "bg-amber-500 text-white hover:bg-amber-600",
  },
};

interface ModeCardProps {
  icon: ReactNode;
  title: string;
  help: string;
  cta: string;
  accent?: ModeAccent;
  /** Small badge under the title, e.g. "Sign-in required". */
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}

/** One selectable game mode on a mini-game's start screen. */
export function ModeCard({
  icon,
  title,
  help,
  cta,
  accent = "neutral",
  hint,
  disabled,
  onSelect,
}: ModeCardProps) {
  const classes = ACCENTS[accent];
  return (
    <Card className="tcg-surface tcg-surface--hover transition-all">
      <CardContent className="flex h-full flex-col items-center justify-between gap-4 p-6 text-center">
        <div className={`rounded-lg p-3 ${classes.icon}`}>{icon}</div>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold">{title}</h3>
          {hint ? (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {hint}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {help}
          </p>
        </div>
        <Button
          onClick={onSelect}
          disabled={disabled}
          className={`h-10 w-full text-xs font-semibold ${classes.button}`}
        >
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
