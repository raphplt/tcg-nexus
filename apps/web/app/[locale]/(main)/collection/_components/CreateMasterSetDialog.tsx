"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  FolderPlus,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { collectionService } from "@/services/collection.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonSetType } from "@/types/cardPokemon";
import type { Collection } from "@/types/collection";

interface CreateMasterSetDialogProps {
  existingCollections: Collection[];
  onCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateMasterSetDialog({
  existingCollections,
  onCreated,
  trigger,
}: CreateMasterSetDialogProps) {
  const t = useTranslations("Collections");
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [allSets, setAllSets] = useState<PokemonSetType[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isCreatingId, setIsCreatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && allSets.length === 0) {
      setIsLoadingSets(true);
      try {
        const sets = await pokemonCardService.getAllSets();
        setAllSets(sets);
      } catch (err) {
        console.error("Failed to fetch sets", err);
        toast.error("Impossible de charger les extensions Pokémon.");
      } finally {
        setIsLoadingSets(false);
      }
    }
  };

  const alreadyStartedSetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of existingCollections) {
      if (c.masterSet?.id) {
        ids.add(c.masterSet.id);
      }
    }
    return ids;
  }, [existingCollections]);

  const filteredSets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSets;
    return allSets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.serie?.name && s.serie.name.toLowerCase().includes(q)),
    );
  }, [allSets, searchQuery]);

  const groupedSets = useMemo(() => {
    const map = new Map<
      string,
      { serieName: string; sets: PokemonSetType[] }
    >();
    for (const set of filteredSets) {
      const serieName = set.serie?.name || "Autres Extensions";
      const serieId = set.serie?.id || "_other";
      if (!map.has(serieId)) {
        map.set(serieId, { serieName, sets: [] });
      }
      map.get(serieId)!.sets.push(set);
    }
    return Array.from(map.values());
  }, [filteredSets]);

  const handleCreate = async (set: PokemonSetType) => {
    if (!user?.id) return;
    setIsCreatingId(set.id);
    try {
      await collectionService.createCollection({
        masterSetId: set.id,
        isPublic: false,
        userId: user.id,
      });
      toast.success(`Master Set "${set.name}" créé avec succès !`);
      setIsOpen(false);
      onCreated();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Erreur lors de la création du Master Set "${set.name}"`,
      );
    } finally {
      setIsCreatingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-primary/40 hover:border-primary bg-background/80 hover:bg-primary/10 text-foreground"
          >
            <Trophy className="w-4 h-4 mr-2 text-amber-500" />
            Nouveau Master Set
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="w-5 h-5 text-amber-500" />
            Suivre un Master Set
          </DialogTitle>
          <DialogDescription>
            Choisissez une extension Pokémon. Votre collection sera
            automatiquement pré-remplie avec l&apos;intégralité des cartes du
            set pour suivre votre progression à 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une extension ou série (ex: 151, Écarlate et Violet)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 min-h-[300px]">
          {isLoadingSets ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Chargement du catalogue des extensions...
              </p>
            </div>
          ) : groupedSets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune extension trouvée pour &quot;{searchQuery}&quot;.
            </div>
          ) : (
            groupedSets.map((group) => (
              <div key={group.serieName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group.serieName}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.sets.map((set) => {
                    const isAlreadyFollowed = alreadyStartedSetIds.has(set.id);
                    const isCurrentCreating = isCreatingId === set.id;

                    return (
                      <div
                        key={set.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isAlreadyFollowed
                            ? "bg-muted/40 opacity-70 border-border/40"
                            : "bg-card hover:bg-accent/40 border-border/80 hover:border-primary/40 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {set.logo ? (
                            <div className="w-12 h-8 relative shrink-0">
                              <Image
                                src={set.logo}
                                alt={set.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate leading-tight">
                              {set.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {set.cardCount?.total || "—"}{" "}
                              cartes
                            </p>
                          </div>
                        </div>

                        {isAlreadyFollowed ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[11px] font-normal"
                          >
                            <Check className="w-3 h-3 mr-1 text-emerald-500" />
                            Déjà suivi
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="shrink-0 h-8 px-3 text-xs"
                            disabled={isCreatingId != null}
                            onClick={() => handleCreate(set)}
                          >
                            {isCurrentCreating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Suivre
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
