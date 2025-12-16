"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Layers,
  User as UserIcon,
  Share2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { decksService } from "@/services/decks.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { DeckCard } from "@/types/deck-cards";
import { Deck } from "@/types/Decks";
import { DeckAnalysis } from "@/types/deck-analysis";

export default function DeckDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = id as string;

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCode, setShareCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, [deckId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => decksService.getDeckById(deckId),
  });

  const shareMutation = useMutation({
    mutationFn: () => decksService.shareDeck(Number(deckId)),
    onSuccess: (data) => {
      setShareCode(data.code);
      setShareDialogOpen(true);
      toast.success("Code de partage généré");
    },
    onError: () => {
      toast.error("Impossible de générer le code de partage");
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: () => decksService.analyzeDeck(Number(deckId)),
    onSuccess: (result) => {
      setAnalysis(result);
      setAnalysisError(null);
      toast.success("Analyse terminée");
    },
    onError: () => {
      setAnalysisError("Impossible d'analyser le deck pour le moment.");
      toast.error("Impossible d'analyser le deck");
    },
  });

  const handleShare = () => {
    shareMutation.mutate();
  };

  const handleAnalyze = () => {
    setAnalysisError(null);
    analyzeMutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Code copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const deck = data as Deck;
  const coverCard =
    deck?.cards?.find((c) => c.card?.image)?.card ||
    deck?.cards?.[0]?.card ||
    undefined;
  const isOwner = user && deck?.user?.id === user.id;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              Erreur lors du chargement du deck.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCards = deck.cards?.reduce((acc, c) => acc + c.qty, 0) || 0;
  const mainCards = deck.cards?.filter((c) => c.role === "main") || [];
  const sideCards = deck.cards?.filter((c) => c.role === "side") || [];

  const normalizeCategory = (cat?: string) =>
    cat?.toLowerCase().replace("é", "e") || "";

  const pokemonCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "pokemon",
    ) || [];
  const trainerCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "trainer",
    ) || [];
  const energyCards =
    deck.cards?.filter(
      (c) => normalizeCategory(c.card?.category) === "energy",
    ) || [];

  const otherCards =
    deck.cards?.filter((c) => {
      const cat = normalizeCategory(c.card?.category);
      return cat !== "pokemon" && cat !== "trainer" && cat !== "energy";
    }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="overflow-hidden border-primary/20 shadow-xl">
          <div className="relative">
            <div className=" w-full bg-gradient-to-r from-primary/20 via-background to-secondary/20" />
            {coverCard?.image && (
              <Image
                src={`${coverCard.image}/low.png`}
                alt={coverCard.name || "Cover"}
                fill
                className="object-cover opacity-20 blur-sm"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/85 to-background/90" />
            <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-32 rounded-lg overflow-hidden border border-border bg-card shadow-lg">
                  {coverCard?.image ? (
                    <Image
                      src={`${coverCard.image}/high.png`}
                      alt={coverCard.name || "Carte"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Layers className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <H1 className="leading-tight">{deck.name}</H1>
                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {deck.format?.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>
                        {deck.user?.firstName} {deck.user?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {deck.createdAt
                          ? new Date(deck.createdAt).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <Badge variant={deck.isPublic ? "default" : "outline"}>
                      {deck.isPublic ? "Public" : "Privé"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleShare}
                      disabled={shareMutation.isPending}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                    <Button
                      onClick={() => router.push(`/decks/${deck.id}/update`)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Éditer le deck
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4">
            <StatBlock
              label="Total cartes"
              value={totalCards}
            />
            <StatBlock
              label="Principal"
              value={mainCards.reduce((acc, c) => acc + c.qty, 0)}
            />
            <StatBlock
              label="Side"
              value={sideCards.reduce((acc, c) => acc + c.qty, 0)}
            />
            <StatBlock
              label="Variétés"
              value={deck.cards?.length || 0}
            />
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-2">
                <CardTitle>Cartes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Parcourez les cartes du deck et leurs quantités.
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="main">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="main">
                      Principal ({mainCards.length})
                    </TabsTrigger>
                    <TabsTrigger value="side">
                      Side ({sideCards.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="main">
                    <CardGrid cards={mainCards} />
                  </TabsContent>
                  <TabsContent value="side">
                    <CardGrid
                      cards={sideCards}
                      emptyLabel="Aucune carte side"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <CardSection
              title="Pokémon"
              cards={pokemonCards}
            />
            <CardSection
              title="Dresseurs"
              cards={trainerCards}
            />
            <CardSection
              title="Energies"
              cards={energyCards}
            />
            <CardSection
              title="Autres"
              cards={otherCards}
            />
          </div>

          <div className="space-y-6">
            <AnalysisCard
              analysis={analysis}
              isLoading={analyzeMutation.isPending}
              error={analysisError}
              onAnalyze={handleAnalyze}
            />

            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label="Format"
                  value={deck.format?.type}
                />
                <InfoRow
                  label="Créateur"
                  value={
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>
                          {deck.user?.firstName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {deck.user?.firstName}
                      </span>
                    </div>
                  }
                />
                <InfoRow
                  label="Visibilité"
                  value={
                    <Badge variant={deck.isPublic ? "default" : "outline"}>
                      {deck.isPublic ? "Public" : "Privé"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Dernière maj"
                  value={
                    deck.updatedAt
                      ? new Date(deck.updatedAt).toLocaleDateString()
                      : "—"
                  }
                />
                {isOwner && (
                  <div className="pt-2">
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => router.push(`/decks/${deck.id}/update`)}
                      disabled
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Modifier mon deck
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le deck</DialogTitle>
            <DialogDescription>
              Partagez ce code avec d'autres joueurs pour qu'ils puissent importer votre deck
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={shareCode}
                readOnly
                className="font-mono text-lg"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(shareCode)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ou partagez ce lien direct :
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/decks/import?code=${shareCode}`}
                  readOnly
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/decks/import?code=${shareCode}`
                    )
                  }
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalysisCard({
  analysis,
  isLoading,
  error,
  onAnalyze,
}: {
  analysis: DeckAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
}) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analyse du deck
          </CardTitle>
          <Button
            onClick={onAnalyze}
            disabled={isLoading}
          >
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

const AnalysisResult = ({ analysis }: { analysis: DeckAnalysis }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <PillStat
        label="Pokémon"
        value={analysis.pokemonCount}
      />
      <PillStat
        label="Énergies"
        value={analysis.energyCount}
      />
      <PillStat
        label="Dresseurs"
        value={analysis.trainerCount}
      />
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
              <li
                key={dup.cardId}
                className="flex justify-between"
              >
                <span>{dup.cardName}</span>
                <span className="text-xs text-muted-foreground">x{dup.qty}</span>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    )}

    {analysis.suggestions.length > 0 && (
      <SuggestionList
        title="Recommandations"
        items={analysis.suggestions}
      />
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

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 text-sm text-muted-foreground">
    {items.map((item, index) => (
      <li
        key={`${item}-${index}`}
        className="flex gap-2"
      >
        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const PillStat = ({ label, value }: { label: string; value: string | number }) => (
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

function CardSection({ title, cards }: { title: string; cards: DeckCard[] }) {
  if (cards.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary">
            {cards.reduce((acc, c) => acc + c.qty, 0)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((deckCard) => (
            <div
              key={deckCard.id}
              className="flex items-center gap-3 p-2 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
            >
              <div className="relative w-12 h-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                {deckCard.card?.image ? (
                  <Image
                    src={deckCard.card.image + "/low.png"}
                    alt={deckCard.card.name || "Carte"}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {deckCard.card?.name || "Carte inconnue"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {deckCard.card?.set?.name}
                </div>
              </div>
              <div className="font-bold text-lg w-8 text-center">
                {deckCard.qty}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const CardGrid = ({
  cards,
  emptyLabel = "Aucune carte",
}: {
  cards: DeckCard[];
  emptyLabel?: string;
}) => {
  if (!cards.length) {
    return (
      <div className="text-sm text-muted-foreground py-4">{emptyLabel}</div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4">
      {cards.map((deckCard) => (
        <div
          key={deckCard.id}
          className="rounded-lg border bg-card hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="relative h-40 bg-muted/40">
            {deckCard.card?.image ? (
              <Image
                src={`${deckCard.card.image}/low.png`}
                alt={deckCard.card.name || "Carte"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Layers className="w-6 h-6" />
              </div>
            )}
            <Badge className="absolute top-2 left-2">x{deckCard.qty}</Badge>
            <Badge
              variant="secondary"
              className="absolute top-2 right-2"
            >
              {deckCard.role === "side" ? "Side" : "Main"}
            </Badge>
          </div>
          <div className="p-3 space-y-1">
            <div className="font-semibold line-clamp-1">
              {deckCard.card?.name || "Carte inconnue"}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {deckCard.card?.set?.name}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between items-center border-b pb-2">
    <span className="text-muted-foreground">{label}</span>
    <div className="font-medium text-right">{value}</div>
  </div>
);

const StatBlock = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-card/70 p-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);
