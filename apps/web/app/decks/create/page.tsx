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

export default function page() {
  const { isAuthenticated } = useAuth();
  const [formatList, setFormatList] = useState([]);
  const [formatLoading, setFormatLoading] = useState(true);
  useEffect(() => {
    const listFormat = async () => {
      return await authedFetch("GET", "deck-format");
    };
    listFormat().then((res) => {
      setFormatList(res);
      setFormatLoading(false);
    });
  }, []);
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
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
      <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
        <Skeleton className="mx-auto max-w-3xl h-120" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-primary/10 py-16 px-2">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Créer un deck</CardTitle>
          <CardDescription>
            Veuillez remplir ce formulaire pour pouvoir créer un deck.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeckForm formats={formatList} />
        </CardContent>
      </Card>
    </div>
  );
}
