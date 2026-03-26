"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pokemonCardService } from "@/services/pokemonCard.service";
import PokemonCardDetail from "@/components/PokemonCard/PokemonCardDetail";
import MarketplaceSection from "@/components/PokemonCard/MarketplaceSection";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

const PokemonCardPage = () => {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["pokemon", id],
    queryFn: () => pokemonCardService.getById(id as string),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-muted-foreground">Chargement de la carte...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center gap-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-destructive">
              Erreur lors du chargement de la carte
            </p>
            <p className="text-muted-foreground text-sm">
              La carte avec l&apos;ID &quot;{id}&quot; n&apos;a pas pu être trouvée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex flex-col items-center gap-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <p className="text-muted-foreground">Carte non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PokemonCardDetail card={data} />
      <div className="container mx-auto px-4 pb-12">
        <MarketplaceSection />
      </div>
    </div>
  );
};

export default PokemonCardPage;
