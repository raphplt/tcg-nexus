import { Button, ButtonProps } from "../ui/button";
import { Star } from "lucide-react";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { useState, ReactNode } from "react";

interface FavoriteButtonProps extends ButtonProps {
  cardId: string;
  userId: number;
  children?: ReactNode;
}

export const FavoriteButton = ({
  cardId,
  userId,
  ...props
}: FavoriteButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleAddToFavorites = async () => {
    setLoading(true);
    try {
      await pokemonCardService.addToFavorites(userId, cardId);
      alert("Carte ajoutée aux favoris !");
    } catch (error) {
      console.error("Erreur ajout favoris :", error);
      alert("Impossible d'ajouter aux favoris");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Ajouter aux favoris"
      onClick={handleAddToFavorites}
      disabled={loading}
      {...props}
    >
      <Star className="w-5 h-5" />
    </Button>
  );
};
