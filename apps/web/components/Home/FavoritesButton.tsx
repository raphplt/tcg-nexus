import { Button } from "../ui/button";
import { Star } from "lucide-react";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export const FavoriteButton = ({ cardId }: { cardId: string }) => {
  const [loading, setLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Réinitialiser l'état quand cardId change
  useEffect(() => {
    setIsFavorite(false);
    setIsAnimating(false);
    setLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [cardId]);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAddToFavorites = async () => {
    setLoading(true);
    setIsAnimating(true);
    try {
      if (!user?.id) {
        router.push("/auth/login");
        return;
      }

      await pokemonCardService.addToFavorites(user.id, cardId);
      await cardEventTracker.trackFavorite(cardId);
      toast.success("Carte ajoutée aux favoris !");
      setIsFavorite(true);
    } catch (error) {
      console.error("Erreur ajout favoris :", error);
      toast.error("Impossible d'ajouter aux favoris");
    } finally {
      setLoading(false);
      timeoutRef.current = setTimeout(() => setIsAnimating(false), 500);
    }
  };

  return (
    <Button
      size="icon"
      variant="outline"
      aria-label="Ajouter aux favoris"
      onClick={handleAddToFavorites}
      disabled={loading}
      className={`relative transition-all duration-300 ease-out ${
        isAnimating
          ? "scale-110 animate-pulse"
          : "hover:scale-105 active:scale-95"
      }`}
    >
      <Star
        className={`w-5 h-5 transition-all duration-500 ease-out ${
          isFavorite
            ? "fill-yellow-400 text-yellow-400 scale-110"
            : "fill-transparent text-current group-hover:text-yellow-300"
        } ${isAnimating ? "animate-spin" : isFavorite ? "animate-none" : ""}`}
      />
      {isAnimating && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="absolute w-8 h-8 rounded-full bg-yellow-400/20 animate-ping" />
        </span>
      )}
    </Button>
  );
};
