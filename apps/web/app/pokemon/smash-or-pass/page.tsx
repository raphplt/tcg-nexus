"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { pokemonCardService } from "@/services/pokemonCard.service";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { H1 } from "@/components/Shared/Titles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PokemonRarity } from "../../../types/enums/pokemonCardsType";

// Hook pour récupérer les séries
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

function PokemonCard({
  card,
  direction,
}: {
  card: any;
  direction: "left" | "right" | null;
}) {
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-[320px]"
    >
      <motion.div
        animate={
          direction === "left"
            ? { x: -400, opacity: 0, rotate: -15 }
            : direction === "right"
              ? { x: 400, opacity: 0, rotate: 15 }
              : { x: 0, opacity: 1, rotate: 0 }
        }
        transition={{ duration: 0.4 }}
      >
        <Card className="rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="flex flex-col items-center p-4">
            <Image
              src={
                card.image
                  ? card.image + "/high.png"
                  : "/images/carte-pokemon-dos.jpg"
              }
              alt={card.name || "Carte Pokémon"}
              width={300}
              height={400}
              className="rounded-xl bg-white"
              style={{ objectFit: "contain" }}
            />
            <h2 className="text-xl font-bold mt-4">{card.name}</h2>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function PokemonMatchPage() {
  const { data: series } = usePokemonSeries();
  const { data: sets } = usePokemonSets();
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const [selectedSerie, setSelectedSerie] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string>("");

  // Hook modifié pour inclure la rareté
  const {
    data: card,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["pokemon-cards", "random", selectedSerie, selectedRarity],
    queryFn: () =>
      pokemonCardService.getRandom(
        selectedSerie && selectedSerie !== "None" ? selectedSerie : undefined,
        selectedRarity && selectedRarity !== "None"
          ? (selectedRarity as PokemonRarity)
          : undefined,
        selectedSet && selectedSet !== "None" ? selectedSet : undefined,
      ),
  });

  const swipe = async (dir: "left" | "right") => {
    setDirection(dir);

    if (dir === "right" && card) {
      try {
        const userId = 1;
        await pokemonCardService.addToWishlist(userId, card.id);
        console.log(`${card.name} ajoutée à la wishlist !`);
      } catch (error) {
        console.error("Erreur lors de l'ajout à la wishlist :", error);
      }
    }

    setTimeout(() => {
      setDirection(null);
      refetch();
    }, 400);
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  if (!card)
    return (
      <div className="flex justify-center items-center h-screen">
        No card found
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
      <H1 className="mb-5">Card Swipe</H1>

      {/* Section filtres */}
      <div className="w-full max-w-4xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dropdown Series */}
          <div className="relative group">
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">
              Bloc
            </label>
            <Select onValueChange={setSelectedSerie}>
              <SelectTrigger className="w-full rounded-2xl border shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur-sm">
                <SelectValue placeholder="Choisir un bloc" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl bg-popover/95 backdrop-blur-lg">
                <SelectItem value="None">Aucun filtre</SelectItem>
                {series.map((serie: any) => (
                  <SelectItem
                    key={serie.id}
                    value={serie.id.toString()}
                  >
                    {serie.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown Rarity */}
          <div className="relative group">
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">
              Rareté
            </label>
            <Select onValueChange={setSelectedRarity}>
              <SelectTrigger className="w-full rounded-2xl border shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur-sm">
                <SelectValue placeholder="Choisir une rareté" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl bg-popover/95 backdrop-blur-lg">
                <SelectItem value="None">Aucun filtre</SelectItem>
                {Object.values(PokemonRarity).map((rarity) => (
                  <SelectItem
                    key={rarity}
                    value={rarity}
                  >
                    {rarity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown Set */}
          <div className="relative group">
            <label className="text-sm font-semibold text-muted-foreground mb-1 block">
              Série
            </label>
            <Select onValueChange={setSelectedSet}>
              <SelectTrigger className="w-full rounded-2xl border shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur-sm">
                <SelectValue placeholder="Choisir une série" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl bg-popover/95 backdrop-blur-lg">
                <SelectItem value="None">Aucun filtre</SelectItem>
                {sets.map((set: any) => (
                  <SelectItem
                    key={set.id}
                    value={set.id.toString()}
                  >
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <PokemonCard
        card={card}
        direction={direction}
      />

      <div className="flex gap-6 mt-6">
        <button
          className="rounded-full w-16 h-16 border-2 border-red-500 hover:bg-red-500 hover:text-white"
          onClick={() => swipe("left")}
        >
          👎
        </button>
        <button
          className="rounded-full w-16 h-16 border-2 border-green-500 hover:bg-green-500 hover:text-white"
          onClick={() => swipe("right")}
        >
          👍
        </button>
      </div>
    </div>
  );
}
