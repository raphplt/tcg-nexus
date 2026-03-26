"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import React, { useEffect, useState } from "react";
import { authedFetch } from "@utils/fetch";
import { Skeleton } from "@components/ui/skeleton";
import { DeckFormat } from "@/types/deckFormat";
import { useParams } from "next/navigation";
import { DeckForm } from "../../create/_components/deckForm";
import { decksService } from "@/services/decks.service";
import { Deck } from "@/types/Decks";
import { useQuery } from "@tanstack/react-query";

export default function UpdateDeckPage() {
  const { isAuthenticated } = useAuth();
  const { id } = useParams();
  const [formatList, setFormatList] = useState<DeckFormat[]>([]);
  const [formatLoading, setFormatLoading] = useState(true);

  useEffect(() => {
    const listFormat = async () => {
      return await authedFetch("GET", "deck-format");
    };
    listFormat().then((res: any) => {
      if (res && Array.isArray(res)) {
        setFormatList(res);
      } else if (res && typeof res === "object" && "data" in res) {
        setFormatList(res.data as DeckFormat[]);
      }
      setFormatLoading(false);
    });
  }, []);

  const {
    data: deck,
    isLoading: deckLoading,
    error,
  } = useQuery({
    queryKey: ["deck", id],
    queryFn: () => decksService.getDeckById(id as string),
    enabled: !!id,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Alert
          className="mx-auto max-w-3xl"
          variant="destructive"
        >
          <AlertCircleIcon />
          <AlertTitle>Connexion requise.</AlertTitle>
          <AlertDescription>
            <p>Vous devez être connecté pour modifier un deck.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (formatLoading || deckLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Skeleton className="mx-auto max-w-5xl h-[720px]" />
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Alert
          className="mx-auto max-w-3xl"
          variant="destructive"
        >
          <AlertCircleIcon />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            <p>Impossible de charger le deck.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <div className="mx-auto max-w-3/4 space-y-6">
        <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-background to-secondary/10">
          <CardHeader>
            <CardTitle className="text-3xl">Modifier le deck</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-xl border-border/60">
          <CardContent className="pt-6">
            <DeckForm
              formats={formatList}
              deck={deck as Deck}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
