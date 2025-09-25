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

// Hook pour récupérer une carte aléatoire
function useRandomCard(selectedSerie: string) {
  return useQuery({
    queryKey: ["pokemon-cards", "random", selectedSerie],
    queryFn: () =>
      pokemonCardService.getRandom(
        selectedSerie || undefined,
        selectedRarity === "all" ? undefined : selectedRarity,
      ),
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
  const [selectedSerie, setSelectedSerie] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  // Hook modifié pour inclure la rareté
  const {
    data: card,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["pokemon-cards", "random", selectedSerie, selectedRarity],
    queryFn: () =>
      pokemonCardService.getRandom(
        selectedSerie || undefined,
        selectedRarity || undefined,
      ),
  });

  const swipe = async (dir: "left" | "right") => {
    setDirection(dir);

    if (dir === "right" && card) {
      try {
        const userId = 1;
        await pokemonCardService.addToWishlist(userId, card.id);
        console.log(`✅ ${card.name} ajoutée à la wishlist !`);
      } catch (error) {
        console.error("❌ Erreur lors de l'ajout à la wishlist :", error);
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
      <H1 className="mb-5">Smash Or Pass</H1>

      {/* Dropdown Series */}
      <div className="w-64 mb-4">
        <Select onValueChange={setSelectedSerie}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrer par série" />
          </SelectTrigger>
          <SelectContent>
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
      <div className="w-64 mb-6">
        <Select onValueChange={setSelectedRarity}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrer par rareté" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem> {/* Option par défaut */}
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
