"use client";

import { CheckCircle2, HelpCircle, ShieldAlert, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DeckLegalityReport } from "@/types/deck-analysis";

interface DeckLegalityBadgeProps {
  legality: DeckLegalityReport;
  /** Share of cards whose effects the engine could read, 0-100. */
  confidence: number;
}

const STATUS_STYLE = {
  valid: { icon: CheckCircle2, className: "text-emerald-600" },
  invalid: { icon: ShieldOff, className: "text-rose-600" },
  unverified: { icon: ShieldAlert, className: "text-amber-600" },
  "not-checked": { icon: HelpCircle, className: "text-muted-foreground" },
} as const;

/**
 * Legality verdict for the deck's format.
 *
 * `unverified` and `not-checked` are rendered as distinct from `valid` on
 * purpose: the analysis must never let a list look legal on the strength of
 * rules it could not read.
 */
export function DeckLegalityBadge({
  legality,
  confidence,
}: DeckLegalityBadgeProps) {
  const t = useTranslations("DeckLegality");
  const { icon: Icon, className } = STATUS_STYLE[legality.status];
  const details = [...legality.errors, ...legality.unknowns];

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={cn("h-5 w-5", className)} />
            <span className={className}>{t(`status.${legality.status}`)}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {legality.format && (
              <Badge variant="outline">{legality.format}</Badge>
            )}
            <Badge variant="secondary" title={t("confidenceHint")}>
              {t("confidence", { percentage: confidence })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      {details.length > 0 && (
        <CardContent className="pt-0">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {details.slice(0, 6).map((detail, index) => (
              <li key={`${detail}-${index}`} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                <span>{detail}</span>
              </li>
            ))}
            {details.length > 6 && (
              <li className="text-xs">
                {t("more", { count: details.length - 6 })}
              </li>
            )}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
