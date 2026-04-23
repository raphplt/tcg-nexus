"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Filter,
  Heart,
  Loader2,
  RotateCcw,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { FavoriteButton } from "@/components/Home/FavoritesButton";
import { H1, H3 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PokemonRarity } from "@/types/enums/pokemonCardsType";
import { getCardImage } from "@/utils/images";

const BG_IMAGES = [
  "/images/backgrounds/ash-pikachu-charizard-pokemon-4k-wallpaper-uhdpaper.com-2605d.jpg",
  "/images/backgrounds/eevee-pokemon-hd-wallpaper-uhdpaper.com-1012a.jpg",
  "/images/backgrounds/gengar-gastly-graveyard-pokemon-hd-wallpaper-uhdpaper.com-3963b.jpg",
  "/images/backgrounds/piplup-pokemon-hd-wallpaper-uhdpaper.com-2595d.jpg",
  "/images/backgrounds/pokemon-scarlet-and-violet-quaxly-fuecoco-sprigatito-hd-wallpaper-uhdpaper.com-4411j.jpg",
];

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
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground/80">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full border-2 border-border bg-background px-3 py-2.5 text-sm font-medium shadow-[2px_2px_0px_0px_hsl(var(--border))] transition-all hover:shadow-[3px_3px_0px_0px_hsl(var(--border))]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border-2 border-border bg-popover shadow-[4px_4px_0px_0px_hsl(var(--border))]">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwipeOverlay({ direction }: { direction: "left" | "right" | null }) {
  if (!direction) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <div
        className={`rounded-full border-4 px-6 py-3 text-2xl font-black uppercase tracking-wider ${
          direction === "right"
            ? "border-green-500 bg-green-500/20 text-green-500"
            : "border-red-500 bg-red-500/20 text-red-500"
        }`}
        style={{ rotate: direction === "right" ? "-12deg" : "12deg" }}
      >
        {direction === "right" ? "SMASH" : "PASS"}
      </div>
    </motion.div>
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
  const cardImage = useMemo(() => getCardImage(card), [card]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card?.id ?? "loading"}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-95"
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: -240, right: 240 }}
          dragSnapToOrigin
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x > 120) onSwipe("right");
            if (info.offset.x < -120) onSwipe("left");
          }}
          animate={
            direction === "left"
              ? { x: -500, opacity: 0, rotate: -18 }
              : direction === "right"
                ? { x: 500, opacity: 0, rotate: 18 }
                : { x: 0, opacity: 1, rotate: 0 }
          }
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileHover={{ y: -4 }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          <SwipeOverlay direction={direction} />

          <Card className="tcg-surface relative overflow-hidden border-2 border-border shadow-[4px_4px_0px_0px_hsl(0_0%_0%/0.15)]">
            <CardContent className="relative p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="border border-border px-2.5 py-0.5 text-[11px] font-bold shadow-[2px_2px_0px_0px_hsl(var(--border))]"
                >
                  {card?.set?.name ?? "Bloc inconnu"}
                </Badge>
                {card?.id ? <FavoriteButton cardId={card.id} /> : null}
              </div>

              <div className="relative mt-2.5 flex items-center justify-center">
                <div className="pokemon-card-image relative">
                  <Image
                    src={cardImage}
                    alt={card?.name ?? "Carte Pokémon"}
                    width={400}
                    height={520}
                    priority
                    className="h-[220px] w-auto object-contain drop-shadow-lg sm:h-[260px] md:h-[300px] lg:h-[340px]"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    #{card?.localId ?? "??"}
                  </p>
                  <H3 className="text-lg! sm:text-xl! truncate">
                    {card?.name ?? "Sans nom"}
                  </H3>
                </div>
                {card?.rarity ? (
                  <Badge className="shrink-0 border-2 border-primary/30 bg-primary/10 text-[11px] font-bold text-primary shadow-[2px_2px_0px_0px_hsl(var(--border))]">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {card.rarity}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-2 text-[11px]"
                  >
                    Rareté inconnue
                  </Badge>
                )}
              </div>
            </CardContent>

            {isFetching && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 border-2 border-border bg-card px-4 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_hsl(var(--border))]">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Nouvelle carte...
                </div>
              </div>
            )}
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
  const [bgIndex] = useState(() =>
    Math.floor(Math.random() * BG_IMAGES.length),
  );
  const [stats, setStats] = useState({ smash: 0, pass: 0 });

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
      ? { label: "Rareté", value: selectedRarity }
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

  const swipe = useCallback(
    async (dir: "left" | "right") => {
      if (!card || isProcessing) return;
      setIsProcessing(true);
      setDirection(dir);

      setStats((prev) => ({
        ...prev,
        [dir === "right" ? "smash" : "pass"]:
          prev[dir === "right" ? "smash" : "pass"] + 1,
      }));

      if (dir === "right" && user?.id) {
        try {
          await pokemonCardService.addToWishlist(user.id, card.id);
        } catch (error) {
          console.error("Erreur lors de l'ajout à la wishlist :", error);
        }
      }

      await wait(400);
      setDirection(null);
      await refetch();
      setIsProcessing(false);
    },
    [card, isProcessing, user?.id, refetch],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") swipe("left");
      if (e.key === "ArrowRight") swipe("right");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [swipe]);

  const resetFilters = () => {
    setSelectedSerie("None");
    setSelectedRarity("None");
    setSelectedSet("None");
    refetch();
  };

  if (!user) return null;

  const total = stats.smash + stats.pass;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src={BG_IMAGES[bgIndex] ?? BG_IMAGES[0] ?? ""}
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-background/88 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/90" />
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-10">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-2 sm:mb-4">
          <div className="tcg-surface flex items-center justify-between gap-3 border-2 border-border px-4 py-2.5 shadow-[4px_4px_0px_0px_hsl(0_0%_0%/0.12)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center border-2 border-primary bg-primary/10 shadow-[2px_2px_0px_0px_hsl(var(--border))]">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <H1 className="text-lg! sm:text-xl!">Smash or Pass</H1>
                <p className="text-[11px] text-muted-foreground sm:text-xs">
                  Swipe pour ajouter à ta wishlist
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Badge
                  variant="secondary"
                  className="border border-border text-[11px] font-bold"
                >
                  {activeFilters.length} filtre
                  {activeFilters.length > 1 ? "s" : ""}
                </Badge>
              )}
              <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="discovery-button gap-2 border-2 border-border px-4 font-bold shadow-[2px_2px_0px_0px_hsl(var(--border))] transition-all hover:shadow-[3px_3px_0px_0px_hsl(var(--border))]"
                  >
                    <Filter className="h-4 w-4" />
                    Filtres
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 border-border shadow-[6px_6px_0px_0px_hsl(var(--border))] sm:max-w-xl">
                  <DialogHeader className="text-left">
                    <DialogTitle className="font-heading text-xl font-bold">
                      Affiner la découverte
                    </DialogTitle>
                    <DialogDescription>
                      Choisis un bloc, une rareté ou une série pour filtrer les
                      cartes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
                    <FilterSelect
                      label="Bloc"
                      value={selectedSerie}
                      placeholder="Choisir un bloc"
                      onValueChange={setSelectedSerie}
                    >
                      <SelectItem value="None">Aucun filtre</SelectItem>
                      {series.map((serie: PokemonSerieType) => (
                        <SelectItem key={serie.id} value={serie.id.toString()}>
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
                        <SelectItem key={rarity} value={rarity}>
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
                        <SelectItem key={set.id} value={set.id.toString()}>
                          {set.name}
                        </SelectItem>
                      ))}
                    </FilterSelect>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 font-semibold"
                      onClick={() => {
                        resetFilters();
                        setIsFiltersOpen(false);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      className="border-2 border-border font-bold shadow-[2px_2px_0px_0px_hsl(var(--border))]"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      Appliquer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Active filters + session stats */}
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.label}
                variant="outline"
                className="border-2 border-dashed border-primary/40 bg-primary/5 px-2.5 py-1 text-xs font-semibold"
              >
                {filter.label}: {filter.value}
              </Badge>
            ))}
            {total > 0 && (
              <div className="ml-auto flex items-center gap-3 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1 text-green-600">
                  <Heart className="h-3 w-3 fill-current" />
                  {stats.smash}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <X className="h-3 w-3" />
                  {stats.pass}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card area — fills remaining space */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
          <div className="relative w-full max-w-95">
            {isLoading || !card ? (
              <div className="w-full">
                <Skeleton className="aspect-[5/7] w-full border-2 border-border shadow-[4px_4px_0px_0px_hsl(var(--border))]" />
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

          {/* Action buttons */}
          <div className="flex items-center gap-4 border-2 border-border bg-card/95 px-5 py-2.5 shadow-[4px_4px_0px_0px_hsl(0_0%_0%/0.15)] backdrop-blur-sm">
            <Button
              variant="outline"
              disabled={isProcessing}
              className="group h-12 w-12 border-2 border-red-400 bg-red-50 p-0 shadow-[3px_3px_0px_0px_rgba(239,68,68,0.3)] transition-all hover:bg-red-500 hover:shadow-[4px_4px_0px_0px_rgba(239,68,68,0.4)] active:shadow-[1px_1px_0px_0px_rgba(239,68,68,0.3)] dark:bg-red-500/10 md:h-14 md:w-14"
              onClick={() => swipe("left")}
            >
              <X
                strokeWidth={3}
                className="h-6 w-6 text-red-500 group-hover:text-white md:h-7 md:w-7"
              />
            </Button>

            <Button
              variant="outline"
              disabled={isProcessing || !card?.id}
              className="h-10 w-10 border-2 border-border p-0 shadow-[2px_2px_0px_0px_hsl(var(--border))] transition-all hover:shadow-[3px_3px_0px_0px_hsl(var(--border))] active:shadow-[1px_1px_0px_0px_hsl(var(--border))]"
              onClick={() => refetch()}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              disabled={isProcessing}
              className="group h-12 w-12 border-2 border-green-400 bg-green-50 p-0 shadow-[3px_3px_0px_0px_rgba(34,197,94,0.3)] transition-all hover:bg-green-500 hover:shadow-[4px_4px_0px_0px_rgba(34,197,94,0.4)] active:shadow-[1px_1px_0px_0px_rgba(34,197,94,0.3)] dark:bg-green-500/10 md:h-14 md:w-14"
              onClick={() => swipe("right")}
            >
              <Heart
                strokeWidth={2.5}
                className="h-6 w-6 text-green-500 group-hover:fill-white group-hover:text-white md:h-7 md:w-7"
              />
            </Button>
          </div>

          {/* Keyboard hint */}
          <p className="hidden text-[11px] text-muted-foreground/50 md:block">
            <kbd className="mx-0.5 inline-block border border-border bg-muted px-1 py-0.5 text-[9px] font-mono shadow-[1px_1px_0px_0px_hsl(var(--border))]">
              &larr;
            </kbd>
            <kbd className="mx-0.5 inline-block border border-border bg-muted px-1 py-0.5 text-[9px] font-mono shadow-[1px_1px_0px_0px_hsl(var(--border))]">
              &rarr;
            </kbd>
            ou glisse la carte
          </p>
        </div>
      </div>
    </div>
  );
}
