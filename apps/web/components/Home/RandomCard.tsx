import React, { use } from "react";
import { Card } from "../ui/card";
import { H2 } from "../Shared/Titles";
import { useQuery } from "@tanstack/react-query";
import { pokemonCardService } from "@/services/pokemonCard.service";
import Image from "next/image";
import { Button } from "../ui/button";
import { Star, RefreshCw, Info } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteButton } from "./FavoritesButton";
const RandomCard = ({ userId }: { userId: number }) => {
  const {
    data: card,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pokemon-cards", "random"],
    queryFn: () => pokemonCardService.getRandom(),
  });
  const user = useAuth();
  const handleAddToFavorites = async () => {
    if (!card) return;
    try {
      console.log("user ID:", userId);
      await pokemonCardService.addToFavorites(userId, card.id);
      alert(`${card.name} ajouté aux favoris !`);
    } catch (err) {
      console.error(err);
      alert("Impossible d'ajouter la carte aux favoris");
    }
  };

  return (
    <Card className="bg-card rounded-xl shadow p-6 flex flex-col items-center">
      <H2 className="mb-4">Carte au hasard</H2>
      {isLoading && <div>Chargement...</div>}
      {error && (
        <div className="text-red-500">
          Erreur lors du chargement de la carte
        </div>
      )}
      {card && (
        <>
          <div className="w-full flex flex-col items-center">
            <div className="relative w-40 h-56 mb-4">
              <Image
                src={
                  card.image
                    ? card.image + "/high.png"
                    : "/images/carte-pokemon-dos.jpg"
                }
                alt={card.name || "Carte Pokémon"}
                fill
                className="object-contain rounded-lg border bg-white"
                style={{ objectFit: "contain" }}
                sizes="(max-width: 640px) 100vw, 320px"
                priority
              />
            </div>
            <div className="text-center mb-2">
              <div className="font-bold text-lg">{card.name}</div>
              <div className="text-sm text-muted-foreground">
                PV : {card.hp} | Type : {card.types?.join(", ")}
              </div>
              <div className="text-xs text-muted-foreground">
                Rareté : {card.rarity || "?"}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <FavoriteButton
                cardId={card.id}
                userId={user.id}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Nouvelle carte"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voir les détails"
                asChild
              >
                <Link href={`/pokemon/${card.id}`}>
                  <Info className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
export default RandomCard;
