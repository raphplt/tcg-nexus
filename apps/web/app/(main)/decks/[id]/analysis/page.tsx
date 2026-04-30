"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { decksService } from "@/services/decks.service";
import { Deck } from "@/types/Decks";

import { DeckDistributions } from "./_components/DeckDistributions";
import { DeckOverviewStats } from "./_components/DeckOverviewStats";
import { DeckRadarChart } from "./_components/DeckRadarChart";
import { DeckScoresPanel } from "./_components/DeckScoresPanel";
import { DeckSuggestionsPanel } from "./_components/DeckSuggestionsPanel";
import { computeDeckScores } from "./_utils/scores";

export default function DeckAnalysisPage() {
  const { id } = useParams();
  const router = useRouter();
  const deckId = id as string;

  const { data: deck, isLoading: isDeckLoading } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => decksService.getDeckById(deckId),
  });

  const analyzeMutation = useMutation({
    mutationFn: () => decksService.analyzeDeck(Number(deckId)),
    onError: () => {
      toast.error("Impossible d'analyser le deck");
    },
  });

  useEffect(() => {
    if (!deckId) return;
    analyzeMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const analysis = analyzeMutation.data ?? null;
  const summary = useMemo(
    () => (analysis ? computeDeckScores(analysis) : null),
    [analysis],
  );

  const isAnalysisLoading = analyzeMutation.isPending && !analysis;
  const deckTyped = deck as Deck | undefined;

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/5 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/decks/${deckId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Analyse du deck
              </h1>
              {isDeckLoading ? (
                <Skeleton className="h-4 w-40 mt-1" />
              ) : deckTyped ? (
                <p className="text-sm text-muted-foreground">
                  <Link
                    href={`/decks/${deckId}`}
                    className="hover:underline"
                  >
                    {deckTyped.name}
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                analyzeMutation.isPending ? "animate-spin" : ""
              }`}
            />
            Relancer l'analyse
          </Button>
        </div>

        {analyzeMutation.isError && !analysis && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center text-sm text-destructive">
              L'analyse n'a pas pu aboutir. Vérifiez que le deck contient des
              cartes puis réessayez.
            </CardContent>
          </Card>
        )}

        {isAnalysisLoading && <AnalysisSkeleton />}

        {analysis && summary && (
          <div className="space-y-6">
            <DeckOverviewStats analysis={analysis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeckScoresPanel summary={summary} />
              <DeckRadarChart summary={summary} />
            </div>

            <DeckDistributions analysis={analysis} />

            <DeckSuggestionsPanel analysis={analysis} />
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-40" />
    </div>
  );
}
