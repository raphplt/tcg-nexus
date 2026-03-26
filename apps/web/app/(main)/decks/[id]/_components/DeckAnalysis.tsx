import { DeckAnalysis } from "@/types/deck-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  Sparkles,
} from "lucide-react";

interface DeckAnalysisProps {
  analysis: DeckAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 text-sm text-muted-foreground">
    {items.map((item, index) => (
      <li key={`${item}-${index}`} className="flex gap-2">
        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const SuggestionList = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Sparkles className="h-4 w-4" />
      <span>{title}</span>
    </div>
    <BulletList items={items} />
  </div>
);

const DistributionBadges = ({
  title,
  data,
}: {
  title: string;
  data: { label: string; count: number; percentage: number }[];
}) => {
  if (!data.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="flex flex-wrap gap-2">
        {data.map((item) => (
          <Badge
            key={`${title}-${item.label}`}
            variant="outline"
            className="gap-2"
          >
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">
              {item.count} · {item.percentage}%
            </span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

const PillStat = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="rounded-lg border bg-card/60 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

const AnalysisSkeleton = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
    </div>
    <Skeleton className="h-16" />
    <Skeleton className="h-24" />
  </div>
);

const AnalysisResult = ({ analysis }: { analysis: DeckAnalysis }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <PillStat label="Pokémon" value={analysis.pokemonCount} />
      <PillStat label="Énergies" value={analysis.energyCount} />
      <PillStat label="Dresseurs" value={analysis.trainerCount} />
      <PillStat
        label="Coût moyen"
        value={analysis.averageEnergyCost.toFixed(2)}
      />
    </div>

    {analysis.warnings.length > 0 && (
      <Alert variant="destructive" className="border-destructive/60">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>À surveiller</AlertTitle>
        <AlertDescription>
          <BulletList items={analysis.warnings} />
        </AlertDescription>
      </Alert>
    )}

    {analysis.duplicates.length > 0 && (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Doublons détectés</AlertTitle>
        <AlertDescription>
          <ul className="space-y-1 text-sm">
            {analysis.duplicates.map((dup) => (
              <li key={dup.cardId} className="flex justify-between">
                <span>{dup.cardName}</span>
                <span className="text-xs text-muted-foreground">
                  x{dup.qty}
                </span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )}

    {analysis.suggestions.length > 0 && (
      <SuggestionList title="Recommandations" items={analysis.suggestions} />
    )}

    {analysis.missingCards.length > 0 && (
      <div className="space-y-2">
        <div className="text-sm font-semibold">Cartes manquantes suggérées</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {analysis.missingCards.map((missing, index) => (
            <div
              key={`${missing.label}-${index}`}
              className="rounded-lg border bg-accent/40 p-3"
            >
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{missing.label}</span>
                <Badge variant="secondary">+{missing.recommendedQty}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {missing.reason}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}

    <DistributionBadges
      title="Répartition des types"
      data={analysis.typeDistribution}
    />
    <DistributionBadges
      title="Courbe de coûts"
      data={analysis.attackCostDistribution.map((item) => ({
        label: `Coût ${item.cost}`,
        count: item.count,
        percentage: item.percentage,
      }))}
    />
  </div>
);

export function DeckAnalysisCard({
  analysis,
  isLoading,
  error,
  onAnalyze,
}: DeckAnalysisProps) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analyse du deck
          </CardTitle>
          <Button onClick={onAnalyze} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Analyser mon deck
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Obtenez des recommandations rapides sur l'équilibre de ce deck.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Analyse impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && <AnalysisSkeleton />}

        {!isLoading && analysis && <AnalysisResult analysis={analysis} />}

        {!isLoading && !analysis && !error && (
          <p className="text-sm text-muted-foreground">
            Lancez une analyse pour afficher les recommandations automatiques.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
