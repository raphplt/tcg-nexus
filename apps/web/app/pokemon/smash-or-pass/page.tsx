"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { collectionService } from "@/services/collection.service";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { H1 } from "@/components/Shared/Titles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PokemonRarity } from "../../../types/enums/pokemonCardsType";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Star, ListPlus, X } from "lucide-react";

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
  const [direction, setDrag] = useState<"left" | "right" | null>(null);
  const { user } = useAuth();

  const [selectedSerie, setSelectedSerie] = useState<string>("");
  const [selectedRarity, setSelectedRarity] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);

  // Fetch user's collections
  const { data: collections } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: () => collectionService.getByUserId(user?.id || 0),
    enabled: !!user?.id,
  });

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
    setDrag(dir);

    if (card && user?.id) {
      try {
        switch (dir) {
          case "right":
            await pokemonCardService.addToWishlist(user.id, card.id);
            console.log(`${card.name} ajoutée à la wishlist !`);
            break;
          case "left":
            // Left signifie "skip" - on ne fait rien de spécial
            console.log(`Skipped ${card.name}`);
            break;
        }
      } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
      }
    }

    setTimeout(() => {
      setDrag(null);
      refetch();
    }, 400);
  };

  const addToWishlist = async () => {
    if (card && user?.id) {
      try {
        await pokemonCardService.addToWishlist(user.id, card.id);

        console.log(`${card.name} ajoutée à la wishlist !`);
        refetch();
      } catch (error) {
        console.error("Erreur lors de l'ajout à la wishlist :", error);
      }
    }
  };

  const addToFavorites = async () => {
    if (card && user?.id) {
      try {
        await pokemonCardService.addToFavorites(user.id, card.id);

        console.log(`${card.name} ajoutée aux favoris !`);
        refetch();
      } catch (error) {
        console.error("Erreur lors de l'ajout aux favoris :", error);
      }
    }
  };

  const addToSelectedCollection = async () => {
    if (card && selectedCollection) {
      try {
        await pokemonCardService.addToCollection(selectedCollection, card.id);

        console.log(`${card.name} ajoutée à la collection sélectionnée !`);
        refetch();
        setShowCollectionSelector(false);
        setSelectedCollection("");
      } catch (error) {
        console.error("Erreur lors de l'ajout à la collection :", error);
      }
    }
  };

  const skip = async () => {
    console.log(`Skipped ${card?.name}`);
    refetch();
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

      {/* Actions Section */}
      <div className="flex flex-col gap-4 mt-6">
        {/* Boutons principaux de swipe */}
        <div className="flex gap-6 justify-center">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-16 h-16 border-2 border-red-500 hover:bg-secondary"
            onClick={() => swipe("left")}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-16 h-16 border-2 border-green-500 hover:bg-secondary"
            onClick={() => swipe("right")}
          >
            ❤️
          </Button>
        </div>

        {/* Boutons d'action détaillés */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={skip}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            Skip
          </Button>
          <Button
            onClick={addToWishlist}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Heart className="mr-2 h-4 w-4" />
            Wishlist
          </Button>
          <Button
            onClick={addToFavorites}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Star className="mr-2 h-4 w-4" />
            Favorites
          </Button>
          <Button
            onClick={() => setShowCollectionSelector(!showCollectionSelector)}
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <ListPlus className="mr-2 h-4 w-4" />
            Choisir Collection
          </Button>
        </div>

        {/* Sélecteur de collection */}
        {showCollectionSelector && (
          <div className="flex gap-2 justify-center items-center mt-2">
            <Select
              onValueChange={setSelectedCollection}
              defaultValue={selectedCollection}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choisir une collection" />
              </SelectTrigger>
              <SelectContent>
                {collections?.data?.map((collection: any) => (
                  <SelectItem
                    key={collection.id}
                    value={collection.id}
                  >
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={addToSelectedCollection}
              disabled={!selectedCollection}
              size="sm"
            >
              Ajouter
            </Button>
            <Button
              onClick={() => {
                setShowCollectionSelector(false);
                setSelectedCollection("");
              }}
              variant="outline"
              size="sm"
            >
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
