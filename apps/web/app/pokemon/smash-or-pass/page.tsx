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
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-muted-foreground sm:text-sm">
          {label}
        </span>
      </div>
      <Select
        value={value}
        onValueChange={onValueChange}
      >
        <SelectTrigger className="w-full rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm shadow-md transition-all hover:-translate-y-[1px] hover:shadow-lg">
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
    () =>
      card?.image ? `${card.image}/high.png` : "/images/carte-pokemon-dos.jpg",
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
          dragConstraints={{ left: -240, right: 240 }}
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
            <CardContent className="relative p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {card?.set?.name ?? "Bloc inconnu"}
                </Badge>
                {card?.id ? <FavoriteButton cardId={card.id} /> : null}
              </div>

              <div className="relative mt-2.5 overflow-hidden rounded-xl bg-muted/30 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                <Image
                  src={cardImage}
                  alt={card?.name ?? "Carte Pokémon"}
                  width={400}
                  height={520}
                  priority
                  className="h-[260px] w-full object-contain mix-blend-normal sm:h-[320px] md:h-[360px] lg:h-[400px]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] opacity-0 transition-opacity duration-300 hover:opacity-100" />
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Carte #{card?.localId ?? "??"}
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {card?.name ?? "Sans nom"}
                  </h2>
                </div>
                {card?.rarity ? (
                  <Badge className="rounded-full bg-primary/90 text-primary-foreground shadow">
                    {card.rarity}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full"
                  >
                    Rareté inconnue
                  </Badge>
                )}
              </div>

              {/* <div className="mt-2.5 grid grid-cols-3 gap-3">
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
              </div> */}
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const activeFilters = [
    selectedSerie !== "None"
      ? {
          label: "Bloc",
          value:
            series.find(
              (serie: PokemonSerieType) =>
                serie.id.toString() === selectedSerie,
            )?.name ?? selectedSerie,
        }
      : null,
    selectedRarity !== "None"
      ? {
          label: "Rareté",
          value: selectedRarity,
        }
      : null,
    selectedSet !== "None"
      ? {
          label: "Série",
          value:
            sets.find(
              (set: PokemonSetType) => set.id.toString() === selectedSet,
            )?.name ?? selectedSet,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];
  const hasFilters = activeFilters.length > 0;

  const {
    data: card,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "pokemon-cards",
      "random",
      selectedSerie,
      selectedRarity,
      selectedSet,
    ],
    queryFn: () =>
      pokemonCardService.getRandom(
        selectedSerie !== "None" ? selectedSerie : undefined,
        selectedRarity !== "None"
          ? (selectedRarity as PokemonRarity)
          : undefined,
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

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-3 sm:px-6 sm:pb-20 sm:pt-4 lg:px-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-full border border-border/60 bg-card/85 px-3.5 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="leading-tight">
                <H1 className="text-lg sm:text-xl">Card discovery</H1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters ? (
                <Badge
                  variant="secondary"
                  className="text-[11px] font-semibold"
                >
                  Filtres actifs
                </Badge>
              ) : null}
              <Dialog
                open={isFiltersOpen}
                onOpenChange={setIsFiltersOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 rounded-full px-3"
                  >
                    <Wand2 className="h-4 w-4" />
                    Filtres
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader className="text-left">
                    <DialogTitle>Affiner la découverte</DialogTitle>
                    <DialogDescription>
                      Choisis un bloc, une rareté ou une série sans quitter la
                      carte.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        resetFilters();
                        setIsFiltersOpen(false);
                      }}
                    >
                      <Wand2 className="h-4 w-4" />
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      Appliquer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-sm backdrop-blur">
              <Flame className="h-4 w-4 text-primary" />
              {series.length} blocs
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2 py-1 shadow-sm backdrop-blur">
              <Stars className="h-4 w-4 text-secondary" />
              {sets.length} séries
            </span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.label}
                variant="outline"
                className="border-dashed px-2 py-1 text-[11px]"
              >
                {filter.label}: {filter.value}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 sm:gap-5 lg:gap-6">
          <div className="relative max-w-[420px]">
            {isLoading || !card ? (
              <div className="w-[300px] sm:w-[360px] md:w-[380px]">
                <Skeleton className="h-[320px] w-full rounded-2xl sm:h-[420px]" />
              </div>
            ) : (
              <PokemonCardView
                card={card}
                direction={direction}
                onSwipe={swipe}
                isFetching={isFetching}
              />
            )}
          </div>

          <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 justify-center px-4 sm:bottom-6 md:sticky md:left-auto md:translate-x-0 md:px-0 md:pb-2 md:pt-1 md:[bottom:auto] md:[top:calc(100vh-160px)]">
            <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur md:gap-4 md:border border-border/60 md:bg-card/80 md:px-4 md:py-3 md:shadow-lg md:backdrop-blur">
              <Button
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="h-12 w-12 rounded-full border-red-500/70 text-red-500 shadow-lg shadow-red-500/15 hover:bg-red-500 hover:text-white md:h-14 md:w-14"
                onClick={() => swipe("left")}
              >
                <ThumbsDown
                  aria-hidden
                  strokeWidth={2.6}
                  className="h-6 w-6 flex-shrink-0 text-red-500 md:text-inherit"
                />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                disabled={isProcessing || !card?.id}
                className="h-12 w-12 rounded-full border border-border/70 text-foreground shadow-md md:h-12 md:w-12"
                onClick={() => refetch()}
              >
                <Shuffle
                  aria-hidden
                  className="h-5 w-5 text-foreground"
                />
              </Button>

              <Button
                variant="outline"
                size="lg"
                disabled={isProcessing}
                className="h-12 w-12 rounded-full border-green-500/70 text-green-600 shadow-lg shadow-green-500/15 hover:bg-green-500 hover:text-white md:h-14 md:w-14"
                onClick={() => swipe("right")}
              >
                <ThumbsUp
                  aria-hidden
                  strokeWidth={2.6}
                  className="h-6 w-6 flex-shrink-0 text-green-600 md:text-inherit"
                />
              </Button>
            </div>
          </div>

          {/* <p className="text-center text-sm text-muted-foreground">
            Glisse la carte à droite pour l’ajouter à ta wishlist, à gauche pour
            passer.
          </p> */}
        </div>
      </div>
    </div>
  );
}
