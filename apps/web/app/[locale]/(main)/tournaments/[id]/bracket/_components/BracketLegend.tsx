"use client";

import { useTranslations } from "next-intl";
import React from "react";

/**
 * Colour key shared by the elimination bracket views.
 */
export function BracketLegend() {
  const t = useTranslations("EliminationBracket");

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded border border-emerald-500/40 bg-emerald-500/10" />
        <span>{t("winner")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded border border-primary/60 bg-primary/5" />
        <span>{t("inProgress")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded border border-border bg-card" />
        <span>{t("scheduledOrUpcoming")}</span>
      </div>
    </div>
  );
}
