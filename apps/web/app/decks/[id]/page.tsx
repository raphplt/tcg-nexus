"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { decksService } from "@/services/decks.service";
import { H1 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { Layers, User as UserIcon, Calendar } from "lucide-react";
import { DeckCard } from "@/types/deck-cards";
import { Deck } from "@/types/Decks";

export default function DeckDetailsPage() {
  const { id } = useParams();
  const deckId = id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => decksService.getDeckById(deckId),
  });

  const deck = data as Deck;
  console.log("Deck data:", deck);

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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <H1>{deck.name}</H1>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>
                    {deck.user?.firstName} {deck.user?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>{deck.format?.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {deck.createdAt
                      ? new Date(deck.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-lg px-4 py-1"
              >
                {totalCards} Cartes
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Card List */}
          <div className="lg:col-span-2 space-y-6">
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

          {/* Sidebar - Stats or Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">{deck.format?.type}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Créateur</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback>
                        {deck.user?.firstName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{deck.user?.firstName}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Visibilité</span>
                  <Badge variant={deck.isPublic ? "default" : "outline"}>
                    {deck.isPublic ? "Public" : "Privé"}
                  </Badge>
                </div>
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
