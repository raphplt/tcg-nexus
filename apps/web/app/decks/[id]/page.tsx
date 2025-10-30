"use client";
import React, { useEffect, useState } from "react";
import { Deck } from "@/types/Decks";
import { decksService } from "@/services/decks.service";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@components/ui/badge";
import Image from "next/image";
import { Skeleton } from "@components/ui/skeleton";
export default function page() {
  const [deck, setDeck] = useState<null | Deck>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const { id } = useParams();
  useEffect(() => {
    const loadDeck = async () => {
      setDeckLoading(true);
      try {
        const response = await decksService.getDeckById(id as string);
        if (response) {
          setDeck(response);
        }
      } catch (e) {
      } finally {
        setDeckLoading(false);
      }
    };
    loadDeck();
  }, [id]);

  if (deckLoading) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
        <Skeleton className="h-30 w-full" />
        <Skeleton className="h-100 w-full" />
      </div>
    );
  }
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-3xl text-primary">
            {deck?.name || "Deck inconnue"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center font-semibold">
            Format :
            <Badge
              variant="outline"
              className="ml-2 text-base"
            >
              {deck?.format?.type}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 ">
        {deck?.cards &&
          deck?.cards.map((c) => (
            <Card
              key={c.id}
              className="border-2 border-primary/30 p-2"
            >
              <Image
                src={c?.card?.image + "/high.png"}
                alt={c?.card?.name || "Carte inconnue"}
                width={160}
                height={360}
                className="rounded-lg shadow-lg border bg-white"
                priority
              />
              <div className="flex">
                <Badge
                  variant="outline"
                  className="mt-2 mr-2 text-base"
                >
                  {c.role}
                </Badge>
                <Badge
                  variant="outline"
                  className="mt-2 text-base"
                >
                  x {c.qty}
                </Badge>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
