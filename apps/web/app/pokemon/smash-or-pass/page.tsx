"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Loader2,
  Shuffle,
  Sparkles,
  Stars,
  ThumbsDown,
  ThumbsUp,
  Wand2,
} from "lucide-react";

import { FavoriteButton } from "@/components/Home/FavoritesButton";
import { H1 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import { PokemonRarity } from "../../../types/enums/pokemonCardsType";

function usePokemonSeries() {
  return useQuery({
    queryKey: ["pokemon-series"],
    queryFn: () => pokemonCardService.getAllSeries(),
    initialData: [],
  });
}

function usePokemonSets() {
  return useQuery({
    queryKey: ["pokemon-set"],
    queryFn: () => pokemonCardService.getAllSets(),
    initialData: [],
  });
}

const shimmerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  placeholder,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
      </div>
      <Select
        value={value}
        onValueChange={onValueChange}
      >
        <SelectTrigger className="w-full rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-md transition-all hover:-translate-y-[1px] hover:shadow-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border border-border/80 bg-popover/95 shadow-2xl backdrop-blur-xl">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function PokemonCardView({
  card,
  direction,
  onSwipe,
  isFetching,
}: {
  card: PokemonCardType;
  direction: "left" | "right" | null;
  onSwipe: (direction: "left" | "right") => void;
  isFetching: boolean;
}) {
  const cardImage = useMemo(
    () => (card?.image ? `${card.image}/high.png` : "/images/carte-pokemon-dos.jpg"),
    [card],
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card?.id ?? "loading"}
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-[420px]"
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: -320, right: 320 }}
          dragSnapToOrigin
          dragElastic={0.22}
          onDragEnd={(_, info) => {
            if (info.offset.x > 140) onSwipe("right");
            if (info.offset.x < -140) onSwipe("left");
          }}
          animate={
            direction === "left"
              ? { x: -420, opacity: 0.3, rotate: -12 }
              : direction === "right"
                ? { x: 420, opacity: 0.3, rotate: 12 }
                : { x: 0, opacity: 1, rotate: 0 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute inset-0 -z-10 scale-[1.04] bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10 blur-3xl" />
          <Card className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.06),transparent_30%)]" />
            <CardContent className="relative p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {card?.set?.name ?? "Bloc inconnu"}
                </Badge>
                {card?.id ? (
                  <FavoriteButton cardId={card.id} />
                ) : null}
              </div>

              <div className="relative mt-4 overflow-hidden rounded-xl border border-border/80 bg-muted/30 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                <Image
                  src={cardImage}
                  alt={card?.name ?? "Carte Pokémon"}
                  width={400}
                  height={520}
                  priority
                  className="h-[420px] w-full object-contain mix-blend-normal"
                />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-0 transition-opacity duration-300 hover:opacity-100" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Carte #{card?.localId ?? "??"}</p>
                  <h2 className="text-2xl font-bold tracking-tight">{card?.name ?? "Sans nom"}</h2>
                </div>
                {card?.rarity ? (
                  <Badge className="rounded-full bg-primary/90 text-primary-foreground shadow">
                    {card.rarity}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full">
                    Rareté inconnue
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <InfoTile
                  label="Bloc"
                  value={card?.set?.name ?? "?"}
                />
                <InfoTile
                  label="HP"
                  value={card?.hp ?? "—"}
                />
                <InfoTile
                  label="Type"
                  value={card?.types?.join(" / ") ?? "Mystère"}
                />
              </div>
            </CardContent>

            {isFetching ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 text-sm font-semibold text-muted-foreground shadow">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Nouvelle carte...
                </div>
              </div>
            ) : null}
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PokemonMatchPage() {
  const { user } = useAuth();
  const { data: series = [] } = usePokemonSeries();
  const { data: sets = [] } = usePokemonSets();

  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSerie, setSelectedSerie] = useState("None");
  const [selectedRarity, setSelectedRarity] = useState<string>("None");
  const [selectedSet, setSelectedSet] = useState<string>("None");

  const {
    data: card,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["pokemon-cards", "random", selectedSerie, selectedRarity, selectedSet],
    queryFn: () =>
      pokemonCardService.getRandom(
        selectedSerie !== "None" ? selectedSerie : undefined,
        selectedRarity !== "None" ? (selectedRarity as PokemonRarity) : undefined,
        selectedSet !== "None" ? selectedSet : undefined,
      ),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const swipe = async (dir: "left" | "right") => {
    if (!card || isProcessing) return;
    setIsProcessing(true);
    setDirection(dir);

    if (dir === "right" && user?.id) {
      try {
        await pokemonCardService.addToWishlist(user.id, card.id);
      } catch (error) {
        console.error("Erreur lors de l'ajout à la wishlist :", error);
      }
    }

    await wait(360);
    setDirection(null);
    await refetch();
    setIsProcessing(false);
  };

  const resetFilters = () => {
    setSelectedSerie("None");
    setSelectedRarity("None");
    setSelectedSet("None");
    refetch();
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,theme(colors.primary)/0.08,transparent_36%),radial-gradient(circle_at_80%_0%,theme(colors.secondary)/0.1,transparent_32%)]">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
        <header className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" />
            Card Discovery
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <H1 className="leading-tight">Smash or Pass Pokémon</H1>
              <p className="max-w-2xl text-balance text-muted-foreground">
                Explore des cartes rares, filtre par bloc, série ou rareté et ajoute tes coups de coeur
                en un swipe. Expérience tactile, rapide, et vraiment « juicy ».
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2 shadow-sm backdrop-blur">
                <Flame className="h-4 w-4 text-primary" />
                {series.length} blocs
              </span>
              <span className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2 shadow-sm backdrop-blur">
                <Stars className="h-4 w-4 text-secondary" />
                {sets.length} séries
              </span>
            </div>
          </div>
        </header>

        <Card className="border border-border/80 bg-card/80 shadow-xl backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">Affiner la découverte</CardTitle>
              <p className="text-sm text-muted-foreground">Mélange bloc, rareté et série pour du swipe ciblé.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Réinitialiser
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FilterSelect
              label="Bloc"
              value={selectedSerie}
              placeholder="Choisir un bloc"
              onValueChange={setSelectedSerie}
            >
              <SelectItem value="None">Aucun filtre</SelectItem>
              {series.map((serie: PokemonSerieType) => (
                <SelectItem
                  key={serie.id}
                  value={serie.id.toString()}
                >
                  {serie.name}
                </SelectItem>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Rareté"
              value={selectedRarity}
              placeholder="Choisir une rareté"
              onValueChange={setSelectedRarity}
            >
              <SelectItem value="None">Aucun filtre</SelectItem>
              {Object.values(PokemonRarity).map((rarity) => (
                <SelectItem
                  key={rarity}
                  value={rarity}
                >
                  {rarity}
                </SelectItem>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Série"
              value={selectedSet}
              placeholder="Choisir une série"
              onValueChange={setSelectedSet}
            >
              <SelectItem value="None">Aucun filtre</SelectItem>
              {sets.map((set: PokemonSetType) => (
                <SelectItem
                  key={set.id}
                  value={set.id.toString()}
                >
                  {set.name}
                </SelectItem>
              ))}
            </FilterSelect>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {isLoading || !card ? (
              <div className="w-[320px] sm:w-[380px]">
                <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
              </div>
            ) : (
              <PokemonCardView
                card={card}
                direction={direction}
                onSwipe={swipe}
                isFetching={isFetching}
              />
            )}

            <Button
              variant="secondary"
              size="icon"
              className="absolute -right-12 top-1/2 hidden -translate-y-1/2 shadow-lg lg:inline-flex"
              onClick={() => refetch()}
            >
              <Shuffle className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              disabled={isProcessing}
              className="h-14 w-14 rounded-full border-red-500/70 text-red-500 shadow-lg shadow-red-500/15 hover:bg-red-500 hover:text-white"
              onClick={() => swipe("left")}
            >
              <ThumbsDown className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              disabled={isProcessing || !card?.id}
              className="h-12 w-12 rounded-full border border-border/70 shadow-md"
              onClick={() => refetch()}
            >
              <Shuffle className="h-5 w-5" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              disabled={isProcessing}
              className="h-14 w-14 rounded-full border-green-500/70 text-green-600 shadow-lg shadow-green-500/15 hover:bg-green-500 hover:text-white"
              onClick={() => swipe("right")}
            >
              <ThumbsUp className="h-6 w-6" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Glisse la carte à droite pour l’ajouter à ta wishlist, à gauche pour passer.
          </p>
        </div>
      </div>
    </div>
  );
}
