import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "../ui/card";
import { H2 } from "../Shared/Titles";
import { useQuery } from "@tanstack/react-query";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";
import Image from "next/image";
import { Button } from "../ui/button";
import {
  RefreshCw,
  Info,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "./FavoritesButton";
import { getCardImage } from "@/utils/images";

const RandomCard = () => {
  const [isFlippingOut, setIsFlippingOut] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [shouldStartFromLeft, setShouldStartFromLeft] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const [history, setHistory] = useState<PokemonCardType[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isNavigatingRef = useRef(false);

  const {
    data: fetchedCard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pokemon-cards", "random"],
    queryFn: () => pokemonCardService.getRandom(),
  });

  useEffect(() => {
    if (fetchedCard && !isNavigatingRef.current) {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        if (trimmed[trimmed.length - 1]?.id === fetchedCard.id) return trimmed;
        return [...trimmed, fetchedCard];
      });
      setHistoryIndex((prev) => prev + 1);
    }
    isNavigatingRef.current = false;
  }, [fetchedCard]);

  const card = history[historyIndex] ?? null;

  useEffect(() => {
    if (card?.id) {
      setIsImageLoading(true);
    }
  }, [card?.id]);

  const animateTransition = useCallback((callback: () => void) => {
    setIsFlippingOut(true);
    setTimeout(async () => {
      callback();
      setIsFlippingOut(false);
      setShouldStartFromLeft(true);
      setIsEntering(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsEntering(true);
          setTimeout(() => {
            setIsEntering(false);
            setShouldStartFromLeft(false);
          }, 300);
        });
      });
    }, 300);
  }, []);

  const isAnimating = isFlippingOut || isEntering;

  const handleNextCard = () => {
    if (isAnimating) return;
    if (historyIndex < history.length - 1) {
      animateTransition(() => {
        isNavigatingRef.current = true;
        setHistoryIndex((i) => i + 1);
      });
    } else {
      animateTransition(() => {
        refetch();
      });
    }
  };

  const handlePreviousCard = () => {
    if (isAnimating || historyIndex <= 0) return;
    animateTransition(() => {
      isNavigatingRef.current = true;
      setHistoryIndex((i) => i - 1);
    });
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
            <div
              className="relative w-40 h-56 mb-4"
              style={{ perspective: "1000px" }}
            >
              <div
                key={card.id}
                className="relative w-full h-full transition-transform duration-300 ease-in-out will-change-transform"
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlippingOut
                    ? "rotateY(90deg)"
                    : isEntering
                      ? "rotateY(0deg)"
                      : shouldStartFromLeft
                        ? "rotateY(-90deg)"
                        : "rotateY(0deg)",
                  opacity: isFlippingOut ? 0 : 1,
                }}
              >
                {isImageLoading && !isFlippingOut && !isEntering && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-500/80 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                <Image
                  src={getCardImage(card)}
                  alt={card.name || "Carte Pokémon"}
                  fill
                  className="object-contain rounded-lg"
                  style={{
                    objectFit: "contain",
                    backfaceVisibility: "hidden",
                  }}
                  sizes="(max-width: 640px) 100vw, 320px"
                  priority
                  onLoadingComplete={() => setIsImageLoading(false)}
                  onError={() => setIsImageLoading(false)}
                />
              </div>
            </div>
            <div className="text-center mb-2">
              <div className="font-bold text-lg">{card.name}</div>
              <div className="text-xs text-muted-foreground">
                Rareté : {card.rarity || "?"}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <FavoriteButton key={card.id} cardId={card.id} />
              <Button
                variant="outline"
                size="icon"
                aria-label="Carte précédente"
                onClick={handlePreviousCard}
                disabled={historyIndex <= 0 || isAnimating}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Nouvelle carte"
                onClick={handleNextCard}
                disabled={isAnimating}
              >
                {historyIndex < history.length - 1 ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Voir les détails"
                asChild
              >
                <Link href={`/marketplace/cards/${card.id}`}>
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
