"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeckAnalysis } from "@/types/deck-analysis";
import { AlertTriangle, Lightbulb, Plus, Sparkles } from "lucide-react";

interface DeckSuggestionsPanelProps {
  analysis: DeckAnalysis;
}

export function DeckSuggestionsPanel({ analysis }: DeckSuggestionsPanelProps) {
  const hasContent =
    analysis.warnings.length > 0 ||
    analysis.suggestions.length > 0 ||
    analysis.duplicates.length > 0 ||
    analysis.missingCards.length > 0;

  if (!hasContent) {
    return (
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Aucun ajustement recommandé
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Le deck semble équilibré, aucune recommandation automatique pour le
          moment.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {analysis.warnings.length > 0 && (
        <Alert variant="destructive" className="border-destructive/60">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Points à surveiller</AlertTitle>
          <AlertDescription>
            <ul className="space-y-1 text-sm">
              {analysis.warnings.map((w, i) => (
                <li key={`${w}-${i}`} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-current" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {analysis.suggestions.length > 0 && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {analysis.suggestions.map((s, i) => (
                <li key={`${s}-${i}`} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.missingCards.length > 0 && (
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Cartes à ajouter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.missingCards.map((m, i) => (
                <div
                  key={`${m.label}-${i}`}
                  className="rounded-lg border bg-accent/40 p-3"
                >
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{m.label}</span>
                    <Badge variant="secondary">+{m.recommendedQty}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.reason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.duplicates.length > 0 && (
        <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Doublons détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {analysis.duplicates.map((d) => (
                <li
                  key={d.cardId}
                  className="flex items-center justify-between"
                >
                  <span>{d.cardName}</span>
                  <Badge variant="outline">x{d.qty}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
