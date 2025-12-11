"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Search } from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { decksService } from "@/services/decks.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

export default function DeckImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const codeFromUrl = searchParams.get("code") || "";
  const [code, setCode] = useState(codeFromUrl);
  const [previewCode, setPreviewCode] = useState(codeFromUrl);

  const { data: deck, isLoading, error } = useQuery({
    queryKey: ["deck-import", previewCode],
    queryFn: () => decksService.getDeckForImport(previewCode),
    enabled: previewCode.length >= 6,
    retry: false,
  });

  const importMutation = useMutation({
    mutationFn: () => decksService.importDeck(previewCode),
    onSuccess: (importedDeck) => {
      toast.success(`Le deck "${importedDeck.name}" a été ajouté à votre collection`);
      router.push(`/decks/${importedDeck.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Impossible d'importer le deck");
    },
  });

  const handleSearch = () => {
    setPreviewCode(code);
  };

  const handleImport = () => {
    if (!user) {
      toast.error("Vous devez être connecté pour importer un deck");
      router.push("/auth/login");
      return;
    }
    importMutation.mutate();
  };

  const groupCardsByRole = (cards: any[]) => {
    const groups: { [key: string]: any[] } = {
      pokemon: [],
      trainer: [],
      energy: [],
    };
    
    cards?.forEach((dc) => {
      const role = dc.role?.toLowerCase() || "pokemon";
      if (groups[role]) {
        groups[role].push(dc);
      }
    });
    
    return groups;
  };

  const cardGroups = deck?.cards ? groupCardsByRole(deck.cards) : null;
  const totalCards = deck?.cards?.reduce((sum, dc) => sum + dc.qty, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <div>
        <H1>Importer un deck</H1>
        <p className="text-muted-foreground mt-2">
          Entrez le code de partage pour prévisualiser et importer un deck
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Code de partage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: ABC12345"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={code.length < 6}>
              <Search className="mr-2 h-4 w-4" />
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {error && previewCode && (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">
              Code invalide ou expiré
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vérifiez le code et réessayez
            </p>
          </CardContent>
        </Card>
      )}

      {deck && !error && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">{deck.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{deck.format?.type}</Badge>
                  <Badge variant="outline">{totalCards} cartes</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Créé par</h3>
            <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {deck.user?.firstName?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm">{deck.user?.firstName} {deck.user?.lastName}</span>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Liste des cartes</h3>
              
              {cardGroups?.pokemon && cardGroups.pokemon.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Pokémon ({cardGroups.pokemon.reduce((sum, dc) => sum + dc.qty, 0)})
                  </h4>
                  <div className="space-y-1">
                    {cardGroups.pokemon.map((dc) => (
                      <div
                        key={dc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{dc.card.name}</span>
                        <Badge variant="secondary">{dc.qty}x</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cardGroups?.trainer && cardGroups.trainer.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Dresseur ({cardGroups.trainer.reduce((sum, dc) => sum + dc.qty, 0)})
                  </h4>
                  <div className="space-y-1">
                    {cardGroups.trainer.map((dc) => (
                      <div
                        key={dc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{dc.card.name}</span>
                        <Badge variant="secondary">{dc.qty}x</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cardGroups?.energy && cardGroups.energy.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Énergie ({cardGroups.energy.reduce((sum, dc) => sum + dc.qty, 0)})
                  </h4>
                  <div className="space-y-1">
                    {cardGroups.energy.map((dc) => (
                      <div
                        key={dc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{dc.card.name}</span>
                        <Badge variant="secondary">{dc.qty}x</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="flex-1"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importer ce deck
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
