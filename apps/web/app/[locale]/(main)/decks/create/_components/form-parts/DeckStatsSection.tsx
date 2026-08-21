import { useTranslations } from "next-intl";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Layers } from "lucide-react";
import { AddedCard } from "../deckForm.schema";

const StatBlock = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-md border bg-background/70 px-2 py-2 text-center">
    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-lg font-bold tabular-nums leading-6">{value}</p>
  </div>
);

interface DeckStatsSectionProps {
  cards: AddedCard[];
  mainCount: number;
  sideCount: number;
}

/** Displays a compact live summary of the current deck composition. */
export const DeckStatsSection: React.FC<DeckStatsSectionProps> = ({
  cards,
  mainCount,
  sideCount,
}) => {
  const t = useTranslations("DeckStats");
  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-background to-secondary/10 shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-4 gap-2">
          <StatBlock label={t("total")} value={mainCount + sideCount} />
          <StatBlock label={t("main")} value={mainCount} />
          <StatBlock label={t("side")} value={sideCount} />
          <StatBlock label={t("varieties")} value={cards.length} />
        </div>
      </CardContent>
    </Card>
  );
};
