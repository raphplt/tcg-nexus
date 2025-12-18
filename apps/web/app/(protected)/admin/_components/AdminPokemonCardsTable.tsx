"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminService,
  PokemonCardPayload,
} from "@/services/admin.service";
import { PokemonCardType, PokemonSetType } from "@/types/cardPokemon";
import { PaginatedResult } from "@/types/pagination";
import { PokemonCardsType } from "@/types/enums/pokemonCardsType";
import { EnergyType } from "@/types/enums/energyType";
import { TrainerType } from "@/types/enums/trainerType";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-hot-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

type CardFormState = {
  name: string;
  localId: string;
  rarity: string;
  setId: string;
  image: string;
  category: PokemonCardsType | "";
  hp: string;
  types: string;
  illustrator: string;
  description: string;
  tcgDexId: string;
  regulationMark: string;
  trainerType: TrainerType | "";
  energyType: EnergyType | "";
};

const defaultCardForm: CardFormState = {
  name: "",
  localId: "",
  rarity: "",
  setId: "",
  image: "",
  category: "",
  hp: "",
  types: "",
  illustrator: "",
  description: "",
  tcgDexId: "",
  regulationMark: "",
  trainerType: "",
  energyType: "",
};

export function AdminPokemonCardsTable() {
  const [cardsData, setCardsData] =
    useState<PaginatedResult<PokemonCardType> | null>(null);
  const [searchResults, setSearchResults] = useState<PokemonCardType[] | null>(null);
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PokemonCardType | null>(null);
  const [cardToDelete, setCardToDelete] = useState<PokemonCardType | null>(null);
  const [form, setForm] = useState<CardFormState>(defaultCardForm);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const loadSets = async () => {
    try {
      const data = await adminService.getPokemonSets();
      setSets(data);
    } catch (err) {
      console.error("Failed to load sets for cards", err);
    }
  };

  const loadCards = async (pageParam: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPokemonCards({ page: pageParam, limit: 10 });
      setCardsData(data);
      setPage(pageParam);
    } catch (err) {
      console.error("Failed to load cards", err);
      setError("Impossible de charger les cartes");
    } finally {
      setIsLoading(false);
    }
  };

  const runSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults(null);
      await loadCards(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await adminService.searchPokemonCards(term.trim());
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed", err);
      setError("Recherche impossible");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSets();
    void loadCards(1);
  }, []);

  useEffect(() => {
    if (searchResults) return;
    void loadCards(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        void runSearch(searchTerm);
      } else {
        setSearchResults(null);
        if (page === 1) {
          void loadCards(1);
        } else {
          setPage(1);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const startCreate = () => {
    setEditing(null);
    setForm(defaultCardForm);
    setOpenModal(true);
  };

  const startEdit = (card: PokemonCardType) => {
    setEditing(card);
    setForm({
      name: card.name ?? "",
      localId: card.localId ?? "",
      rarity: card.rarity ?? "",
      setId: card.set?.id ?? "",
      image: card.image ?? "",
      category: (card.category as PokemonCardsType) ?? "",
      hp: card.hp?.toString() ?? "",
      types: card.types?.join(", ") ?? "",
      illustrator: card.illustrator ?? "",
      description: card.description ?? "",
      tcgDexId: card.tcgDexId ?? "",
      regulationMark: card.regulationMark ?? "",
      trainerType: (card.trainerType as TrainerType) ?? "",
      energyType: (card.energyType as EnergyType) ?? "",
    });
    setOpenModal(true);
  };

  const saveCard = async () => {
    if (!form.setId) {
      toast.error("Sélectionnez un set pour la carte");
      return;
    }

    const payload: PokemonCardPayload = {
      setId: form.setId,
      name: form.name || undefined,
      localId: form.localId || undefined,
      rarity: form.rarity || undefined,
      image: form.image || undefined,
      category: form.category
        ? (form.category as PokemonCardsType)
        : undefined,
      hp: form.hp ? Number.parseInt(form.hp, 10) : undefined,
      types: form.types
        ? form.types.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      illustrator: form.illustrator || undefined,
      description: form.description || undefined,
      tcgDexId: form.tcgDexId || undefined,
      regulationMark: form.regulationMark || undefined,
      trainerType: form.trainerType
        ? (form.trainerType as TrainerType)
        : undefined,
      energyType: form.energyType ? (form.energyType as EnergyType) : undefined,
    };

    try {
      if (editing) {
        await adminService.updatePokemonCard(editing.id, payload);
        toast.success("Carte mise à jour");
      } else {
        await adminService.createPokemonCard(payload);
        toast.success("Carte créée");
      }
      setOpenModal(false);
      setForm(defaultCardForm);
      if (searchResults) {
        await runSearch(searchTerm);
      } else {
        await loadCards(page);
      }
    } catch (err) {
      console.error("Unable to save card", err);
      toast.error("Enregistrement impossible");
    }
  };

  const confirmDelete = async () => {
    if (!cardToDelete) return;
    try {
      await adminService.deletePokemonCard(cardToDelete.id);
      toast.success("Carte supprimée");
      setCardToDelete(null);
      if (searchResults) {
        await runSearch(searchTerm);
      } else {
        await loadCards(page);
      }
    } catch (err) {
      console.error("Unable to delete card", err);
      toast.error("Suppression impossible");
    }
  };

  const cards = useMemo(
    () => (searchResults ? searchResults : cardsData?.data ?? []),
    [cardsData, searchResults],
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Cartes Pokémon</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ajouter, modifier ou retirer des cartes du catalogue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une carte..."
              className="pl-8 w-64"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle carte
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Local Id</TableHead>
                <TableHead>Set</TableHead>
                <TableHead>Rareté</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>HP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <Spinner size="small" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-semibold">{card.name}</TableCell>
                    <TableCell className="font-mono text-xs">{card.localId}</TableCell>
                    <TableCell>{card.set?.name ?? "-"}</TableCell>
                    <TableCell>
                      {card.rarity ? (
                        <Badge variant="secondary">{card.rarity}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {card.category ?? "-"}
                    </TableCell>
                    <TableCell>{card.hp ?? "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(card)}
                        aria-label={`Modifier ${card.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCardToDelete(card)}
                        aria-label={`Supprimer ${card.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && cards.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Aucune carte trouvée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!searchResults && cardsData?.meta && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {cardsData.meta.currentPage} / {cardsData.meta.totalPages}
            </p>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={cardsData.meta.currentPage === 1 || isLoading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  isLoading ||
                  cardsData.meta.currentPage >= cardsData.meta.totalPages
                }
                onClick={() =>
                  setPage((prev) =>
                    cardsData.meta
                      ? Math.min(cardsData.meta.totalPages, prev + 1)
                      : prev + 1,
                  )
                }
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la carte" : "Nouvelle carte"}</DialogTitle>
            <DialogDescription>
              Renseignez les données principales de la carte.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Nom</Label>
              <Input
                id="card-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-local-id">Local Id</Label>
              <Input
                id="card-local-id"
                value={form.localId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, localId: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Set</Label>
              <Select
                value={form.setId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, setId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un set" />
                </SelectTrigger>
                <SelectContent>
                  {sets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-rarity">Rareté</Label>
              <Input
                id="card-rarity"
                value={form.rarity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rarity: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Catégorie</Label>
              <Select
                value={form.category || "none"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    category: value === "none" ? "" : (value as PokemonCardsType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  {Object.values(PokemonCardsType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-hp">HP</Label>
              <Input
                id="card-hp"
                type="number"
                value={form.hp}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, hp: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-types">Types (séparés par des virgules)</Label>
              <Input
                id="card-types"
                value={form.types}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, types: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-image">Image (URL)</Label>
              <Input
                id="card-image"
                value={form.image}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, image: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-illustrator">Illustrateur</Label>
              <Input
                id="card-illustrator"
                value={form.illustrator}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, illustrator: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-tcg-id">TCG Dex Id</Label>
              <Input
                id="card-tcg-id"
                value={form.tcgDexId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tcgDexId: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-regulation">Marque de régulation</Label>
              <Input
                id="card-regulation"
                value={form.regulationMark}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    regulationMark: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Type d'entraîneur</Label>
              <Select
                value={form.trainerType || "none"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    trainerType: value === "none" ? "" : (value as TrainerType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  {Object.values(TrainerType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type d'énergie</Label>
              <Select
                value={form.energyType || "none"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    energyType: value === "none" ? "" : (value as EnergyType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Non renseigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non renseigné</SelectItem>
                  {Object.values(EnergyType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveCard}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(cardToDelete)}
        onOpenChange={(open) => {
          if (!open) setCardToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette carte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCardToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
