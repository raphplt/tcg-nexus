"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { DeckForm } from "./_components/deckForm";
import React, { useEffect, useState } from "react";
import { authedFetch } from "@utils/fetch";
import { Skeleton } from "@components/ui/skeleton";
import { DeckFormat } from "@/types/deckFormat";

export default function CreateDeckPage() {
  const { isAuthenticated } = useAuth();
  const [formatList, setFormatList] = useState<DeckFormat[]>([]);
  const [formatLoading, setFormatLoading] = useState(true);

  useEffect(() => {
    const loadFormats = async () => {
      try {
        const res = await authedFetch<DeckFormat[]>("GET", "deck-format");
        if (Array.isArray(res)) {
          setFormatList(res);
        } else if (res && typeof res === "object" && "data" in (res as any)) {
          setFormatList((res as any).data as DeckFormat[]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des formats", err);
      } finally {
        setFormatLoading(false);
      }
    };
    loadFormats();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Alert
          variant="destructive"
          className="mx-auto max-w-3xl"
        >
          <AlertCircleIcon />
          <AlertTitle>Connexion requise.</AlertTitle>
          <AlertDescription>
            <p>Vous devez être connecté pour créer un deck.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (formatLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 via-background to-primary/10 py-16 px-4">
        <Skeleton className="mx-auto max-w-5xl h-[720px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/10 py-12 px-4">
      <div className="max-w-3/4 mx-auto space-y-6">
        <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-background to-secondary/10">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Créer un deck</CardTitle>
            <CardDescription className="text-base">
              Recherchez vos cartes avec des filtres avancés, ajustez les
              quantités et prévisualisez votre deck avant de le publier.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="shadow-xl border-border/60">
          <CardContent className="pt-6">
            <DeckForm formats={formatList} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
