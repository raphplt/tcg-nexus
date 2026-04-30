"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DeckScoreSummary, scoreTone } from "../_utils/scores";
import { cn } from "@/lib/utils";

interface DeckScoresPanelProps {
  summary: DeckScoreSummary;
}

const toneClass: Record<ReturnType<typeof scoreTone>, string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
};

const toneRing: Record<ReturnType<typeof scoreTone>, string> = {
  good: "ring-emerald-500/30",
  warn: "ring-amber-500/30",
  bad: "ring-rose-500/30",
};

export function DeckScoresPanel({ summary }: DeckScoresPanelProps) {
  const tone = scoreTone(summary.global);

  return (
    <Card
      className={cn(
        "border-primary/20 shadow-sm ring-2",
        toneRing[tone],
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Score global</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Évaluation calculée à partir des indicateurs ci-dessous.
            </p>
          </div>
          <div className="text-right">
            <div className={cn("text-4xl font-bold", toneClass[tone])}>
              {summary.global}
            </div>
            <div className="text-xs text-muted-foreground">/ 100</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.scores.map((s) => {
          const t = scoreTone(s.value);
          return (
            <div key={s.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.hint}</div>
                </div>
                <div className={cn("text-sm font-semibold", toneClass[t])}>
                  {s.value}
                </div>
              </div>
              <Progress value={s.value} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
