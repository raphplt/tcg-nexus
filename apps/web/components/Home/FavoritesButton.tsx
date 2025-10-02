import { Button } from "../ui/button";
import { Star } from "lucide-react";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const FavoriteButton = ({ cardId }: { cardId: string }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const handleAddToFavorites = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        router.push("/auth/login");
        return;
      }

      await pokemonCardService.addToFavorites(user.id, cardId);
      toast.success("Carte ajoutée aux favoris !");
    } catch (error) {
      console.error("Erreur ajout favoris :", error);
      toast.error("Impossible d'ajouter aux favoris");
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
    >
      <Star className="w-5 h-5" />
    </Button>
  );
};
