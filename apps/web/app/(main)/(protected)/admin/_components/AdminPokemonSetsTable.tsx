"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService, PokemonSetPayload } from "@/services/admin.service";
import { PokemonSerieType, PokemonSetType } from "@/types/cardPokemon";
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
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";

type SetFormState = {
  id: string;
  name: string;
  serieId: string;
  logo: string;
  symbol: string;
  releaseDate: string;
  tcgOnline: string;
  cardCountTotal: string;
  cardCountOfficial: string;
  cardCountReverse: string;
  cardCountHolo: string;
  cardCountFirstEd: string;
  legalStandard: boolean;
  legalExpanded: boolean;
};

const defaultSetForm: SetFormState = {
  id: "",
  name: "",
  serieId: "",
  logo: "",
  symbol: "",
  releaseDate: "",
  tcgOnline: "",
  cardCountTotal: "",
  cardCountOfficial: "",
  cardCountReverse: "",
  cardCountHolo: "",
  cardCountFirstEd: "",
  legalStandard: false,
  legalExpanded: false,
};

export function AdminPokemonSetsTable() {
  const [sets, setSets] = useState<PokemonSetType[]>([]);
  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PokemonSetType | null>(null);
  const [setToDelete, setSetToDelete] = useState<PokemonSetType | null>(null);
  const [form, setForm] = useState<SetFormState>(defaultSetForm);

  const loadSets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedSets, loadedSeries] = await Promise.all([
        adminService.getPokemonSets(),
        adminService.getPokemonSeries(),
      ]);
      setSets(loadedSets);
      setSeries(loadedSeries);
    } catch (err) {
      console.error("Failed to load sets", err);
      setError("Impossible de charger les extensions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSets();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(defaultSetForm);
    setOpenModal(true);
  };

  const startEdit = (set: PokemonSetType) => {
    setEditing(set);
    setForm({
      id: set.id,
      name: set.name,
      serieId: set.serie?.id ?? "",
      logo: set.logo ?? "",
      symbol: set.symbol ?? "",
      releaseDate: set.releaseDate?.slice(0, 10) ?? "",
      tcgOnline: set.tcgOnline ?? "",
      cardCountTotal: set.cardCount?.total?.toString() ?? "",
      cardCountOfficial: set.cardCount?.official?.toString() ?? "",
      cardCountReverse: set.cardCount?.reverse?.toString() ?? "",
      cardCountHolo: set.cardCount?.holo?.toString() ?? "",
      cardCountFirstEd: set.cardCount?.firstEd?.toString() ?? "",
      legalStandard: set.legal?.standard ?? false,
      legalExpanded: set.legal?.expanded ?? false,
    });
    setOpenModal(true);
  };

  const numberOrUndefined = (value: string) =>
    value === "" ? undefined : Number.parseInt(value, 10);

  const saveSet = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.releaseDate.trim()) {
      toast.error("Id, nom et date de sortie sont obligatoires");
      return;
    }
    if (!form.serieId.trim()) {
      toast.error("Associez une série à ce set");
      return;
    }

    const payload: PokemonSetPayload = {
      id: form.id.trim(),
      name: form.name.trim(),
      logo: form.logo.trim() || undefined,
      symbol: form.symbol.trim() || undefined,
      releaseDate: form.releaseDate,
      tcgOnline: form.tcgOnline.trim() || undefined,
      serieId: form.serieId,
      cardCount: {
        total: numberOrUndefined(form.cardCountTotal),
        official: numberOrUndefined(form.cardCountOfficial),
        reverse: numberOrUndefined(form.cardCountReverse),
        holo: numberOrUndefined(form.cardCountHolo),
        firstEd: numberOrUndefined(form.cardCountFirstEd),
      },
      legal: {
        standard: form.legalStandard,
        expanded: form.legalExpanded,
      },
    };

    try {
      if (editing) {
        const { id, ...updatePayload } = payload;
        await adminService.updatePokemonSet(editing.id, updatePayload);
        toast.success("Set mis à jour");
      } else {
        await adminService.createPokemonSet(payload);
        toast.success("Set créé");
      }
      setOpenModal(false);
      setForm(defaultSetForm);
      await loadSets();
    } catch (err) {
      console.error("Unable to save set", err);
      toast.error("Enregistrement impossible");
    }
  };

  const confirmDelete = async () => {
    if (!setToDelete) return;
    try {
      await adminService.deletePokemonSet(setToDelete.id);
      toast.success("Set supprimé");
      setSetToDelete(null);
      await loadSets();
    } catch (err) {
      console.error("Unable to delete set", err);
      toast.error("Suppression impossible");
    }
  };

  const sortedSets = useMemo(
    () =>
      [...sets].sort(
        (a, b) =>
          new Date(b.releaseDate ?? "").getTime() -
          new Date(a.releaseDate ?? "").getTime(),
      ),
    [sets],
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Extensions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créer, éditer et supprimer les sets Pokémon.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau set
        </Button>
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
                <TableHead>Id</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Date de sortie</TableHead>
                <TableHead>Cartes</TableHead>
                <TableHead>Légal</TableHead>
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
                sortedSets.map((set) => (
                  <TableRow key={set.id}>
                    <TableCell className="font-mono text-xs">{set.id}</TableCell>
                    <TableCell className="font-semibold">{set.name}</TableCell>
                    <TableCell>{set.serie?.name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {set.releaseDate
                          ? new Date(set.releaseDate).toLocaleDateString("fr-FR")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {set.cardCount?.total ? (
                        <Badge variant="secondary">
                          {set.cardCount.total} cartes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Badge variant={set.legal?.standard ? "default" : "outline"}>
                        Standard
                      </Badge>
                      <Badge variant={set.legal?.expanded ? "default" : "outline"}>
                        Étendu
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(set)}
                        aria-label={`Modifier ${set.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSetToDelete(set)}
                        aria-label={`Supprimer ${set.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && sortedSets.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Aucun set pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le set" : "Nouveau set"}</DialogTitle>
            <DialogDescription>
              Renseignez les informations principales et l'association à une série.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="set-id">Id</Label>
              <Input
                id="set-id"
                value={form.id}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, id: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-name">Nom</Label>
              <Input
                id="set-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Série</Label>
              <Select
                value={form.serieId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, serieId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une série" />
                </SelectTrigger>
                <SelectContent>
                  {series.map((serie) => (
                    <SelectItem key={serie.id} value={serie.id}>
                      {serie.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-release">Date de sortie</Label>
              <Input
                id="set-release"
                type="date"
                value={form.releaseDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, releaseDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-logo">Logo (URL)</Label>
              <Input
                id="set-logo"
                value={form.logo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, logo: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-symbol">Symbole (URL)</Label>
              <Input
                id="set-symbol"
                value={form.symbol}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, symbol: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-tcg-online">Code TCG Online</Label>
              <Input
                id="set-tcg-online"
                value={form.tcgOnline}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tcgOnline: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="count-total">Cartes totales</Label>
              <Input
                id="count-total"
                type="number"
                value={form.cardCountTotal}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cardCountTotal: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count-official">Officielles</Label>
              <Input
                id="count-official"
                type="number"
                value={form.cardCountOfficial}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cardCountOfficial: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count-reverse">Reverse</Label>
              <Input
                id="count-reverse"
                type="number"
                value={form.cardCountReverse}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cardCountReverse: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count-holo">Holo</Label>
              <Input
                id="count-holo"
                type="number"
                value={form.cardCountHolo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cardCountHolo: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count-first-ed">1ère édition</Label>
              <Input
                id="count-first-ed"
                type="number"
                value={form.cardCountFirstEd}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cardCountFirstEd: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Standard</p>
                <p className="text-xs text-muted-foreground">
                  Légal au format standard
                </p>
              </div>
              <Button
                variant={form.legalStandard ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    legalStandard: !prev.legalStandard,
                  }))
                }
              >
                {form.legalStandard ? "Oui" : "Non"}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Étendu</p>
                <p className="text-xs text-muted-foreground">
                  Légal au format étendu
                </p>
              </div>
              <Button
                variant={form.legalExpanded ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    legalExpanded: !prev.legalExpanded,
                  }))
                }
              >
                {form.legalExpanded ? "Oui" : "Non"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveSet}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(setToDelete)}
        onOpenChange={(open) => {
          if (!open) setSetToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce set ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera les cartes associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSetToDelete(null)}>
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
