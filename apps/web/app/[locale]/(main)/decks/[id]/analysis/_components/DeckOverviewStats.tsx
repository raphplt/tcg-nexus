"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DeckAnalysis } from "@/types/deck-analysis";

interface DeckOverviewStatsProps {
  analysis: DeckAnalysis;
}

const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <Card className="border-primary/20 shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

export function DeckOverviewStats({ analysis }: DeckOverviewStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Stat
        label="Total"
        value={`${analysis.totalCards}/60`}
        hint={analysis.totalCards === 60 ? "Format respecté" : "Hors format"}
      />
      <Stat label="Pokémon" value={analysis.pokemonCount} />
      <Stat label="Énergies" value={analysis.energyCount} />
      <Stat label="Dresseurs" value={analysis.trainerCount} />
      <Stat
        label="Coût moyen"
        value={analysis.averageEnergyCost.toFixed(2)}
        hint="Énergies par attaque"
      />
    </div>
  );
}
