"use client";

import React, { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  FileUp,
  Loader2,
  Search,
  Upload,
} from "lucide-react";
import { H1 } from "@/components/Shared/Titles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { decksService, DeckExportJson } from "@/services/decks.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

export default function DeckImportPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <DeckImportContent />
    </Suspense>
  );
}

function DeckImportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const codeFromUrl = searchParams.get("code") || "";
  const [activeTab, setActiveTab] = useState<"code" | "json">(
    codeFromUrl ? "code" : "code",
  );
  const [code, setCode] = useState(codeFromUrl);
  const [previewCode, setPreviewCode] = useState(codeFromUrl);

  // JSON import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonData, setJsonData] = useState<DeckExportJson | null>(null);
  const [jsonFileName, setJsonFileName] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const {
    data: deck,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["deck-import", previewCode],
    queryFn: () => decksService.getDeckForImport(previewCode),
    enabled: previewCode.length >= 6,
    retry: false,
  });

  const importMutation = useMutation({
    mutationFn: () => decksService.importDeck(previewCode),
    onSuccess: (importedDeck) => {
      toast.success(
        `Le deck "${importedDeck.name}" a été ajouté à votre collection`,
      );
      router.push(`/decks/${importedDeck.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Impossible d'importer le deck");
    },
  });

  const importJsonMutation = useMutation({
    mutationFn: (data: DeckExportJson) => decksService.importDeckFromJson(data),
    onSuccess: (result) => {
      const deckName = result.deck.name;
      toast.success(`Le deck "${deckName}" a été importé avec succès`);
      if (result.warnings?.length) {
        result.warnings.forEach((w) => toast(w, { icon: "\u26A0\uFE0F" }));
      }
      router.push(`/decks/${result.deck.id}`);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Impossible d'importer le deck",
      );
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonError(null);
    setJsonData(null);
    setJsonFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.name || !parsed.format || !Array.isArray(parsed.cards)) {
          setJsonError(
            'Format JSON invalide. Le fichier doit contenir "name", "format" et "cards".',
          );
          return;
        }
        setJsonData(parsed);
      } catch {
        setJsonError(
          "Impossible de lire le fichier. Assurez-vous qu'il s'agit d'un fichier JSON valide.",
        );
      }
    };
    reader.readAsText(file);
  };

  const handleImportJson = () => {
    if (!user) {
      toast.error("Vous devez être connecté pour importer un deck");
      router.push("/auth/login");
      return;
    }
    if (!jsonData) return;
    importJsonMutation.mutate(jsonData);
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
  const jsonTotalCards =
    jsonData?.cards?.reduce((sum, c) => sum + c.qty, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>

      <div>
        <H1>Importer un deck</H1>
        <p className="text-muted-foreground mt-2">
          Importez un deck via un code de partage ou un fichier JSON
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "code" ? "default" : "outline"}
          onClick={() => setActiveTab("code")}
        >
          <Search className="mr-2 h-4 w-4" />
          Code de partage
        </Button>
        <Button
          variant={activeTab === "json" ? "default" : "outline"}
          onClick={() => setActiveTab("json")}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Fichier JSON
        </Button>
      </div>

      {/* Share Code Tab */}
      {activeTab === "code" && (
        <>
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
                    <span className="text-sm">
                      {deck.user?.firstName} {deck.user?.lastName}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Liste des cartes</h3>

                  {cardGroups?.pokemon && cardGroups.pokemon.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Pokémon (
                        {cardGroups.pokemon.reduce(
                          (sum, dc) => sum + dc.qty,
                          0,
                        )}
                        )
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
                        Dresseur (
                        {cardGroups.trainer.reduce(
                          (sum, dc) => sum + dc.qty,
                          0,
                        )}
                        )
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
                        Énergie (
                        {cardGroups.energy.reduce((sum, dc) => sum + dc.qty, 0)}
                        )
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
        </>
      )}

      {/* JSON File Tab */}
      {activeTab === "json" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Importer depuis un fichier JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez un fichier JSON exporté depuis TCG Nexus ou
                respectant le format d'export.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">
                  Cliquez pour sélectionner un fichier JSON
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  .json uniquement
                </p>
                {jsonFileName && (
                  <Badge variant="secondary" className="mt-3">
                    {jsonFileName}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {jsonError && (
            <Card className="border-destructive">
              <CardContent className="py-8 text-center">
                <p className="text-destructive font-medium">{jsonError}</p>
              </CardContent>
            </Card>
          )}

          {jsonData && !jsonError && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">{jsonData.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{jsonData.format}</Badge>
                      <Badge variant="outline">{jsonTotalCards} cartes</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Liste des cartes</h3>
                  <div className="space-y-1">
                    {jsonData.cards.map((card, idx) => (
                      <div
                        key={`${card.tcgDexId}-${idx}`}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{card.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {card.tcgDexId}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {card.role}
                          </Badge>
                          <Badge variant="secondary">{card.qty}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button
                    onClick={handleImportJson}
                    disabled={importJsonMutation.isPending}
                    className="flex-1"
                  >
                    {importJsonMutation.isPending ? (
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
        </>
      )}
    </div>
  );
}
