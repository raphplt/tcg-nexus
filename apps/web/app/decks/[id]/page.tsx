"use client";
import React, { useEffect, useState } from "react";
import { Deck } from "@/types/Decks";
import { decksService } from "@/services/decks.service";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@components/ui/badge";
import Image from "next/image";
import { Skeleton } from "@components/ui/skeleton";

export default function Page() {
  const [deck, setDeck] = useState<null | Deck>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    const loadDeck = async () => {
      setDeckLoading(true);
      try {
        const response = await decksService.getDeckById(id as string);
        if (response) setDeck(response);
      } catch (e) {
        console.error(e);
      } finally {
        setDeckLoading(false);
      }
    };
    loadDeck();
  }, [id]);

  if (deckLoading) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4 flex flex-col gap-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-12 px-4">
      <Card className="mx-auto w-full max-w-6xl shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-3xl text-primary">
            {deck?.name || "Deck inconnu"}
          </CardTitle>
          <div className="flex items-center font-semibold">
            Format :
            <Badge
              variant="outline"
              className="ml-2 text-base"
            >
              {deck?.format?.type}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* === Grille d’affichage du deck === */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center mt-6">
            {deck?.cards?.map((c) => (
              <div
                key={c.id}
                className="flex flex-col items-center"
              >
                {c.card?.image ? (
                  <Image
                    src={c.card.image + "/high.png"}
                    alt={c.card?.name || "Carte inconnue"}
                    width={180}
                    height={250}
                    className="rounded-xl shadow-lg border bg-white hover:scale-105 transition-transform duration-200"
                    priority
                  />
                ) : (
                  <div className="w-[180px] h-[250px] bg-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-sm text-gray-500">No image</span>
                  </div>
                )}

                <p className="mt-2 text-base font-semibold text-gray-800">
                  x{c.qty}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
