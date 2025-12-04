"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Edit3,
  Layers,
  User as UserIcon,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decksService } from "@/services/decks.service";
import { useAuth } from "@/contexts/AuthContext";
import { DeckCard } from "@/types/deck-cards";
import { Deck } from "@/types/Decks";

export default function DeckDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deckId = id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => decksService.getDeckById(deckId),
  });

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
                  <Button
                    onClick={() => router.push(`/decks/${deck.id}/update`)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Éditer le deck
                  </Button>
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
    </div>
  );
}

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
