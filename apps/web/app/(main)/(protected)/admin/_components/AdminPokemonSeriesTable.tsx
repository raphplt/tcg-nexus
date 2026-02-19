"use client";

import { useEffect, useState } from "react";
import { adminService, PokemonSeriePayload } from "@/services/admin.service";
import { PokemonSerieType } from "@/types/cardPokemon";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type SerieFormState = {
  id: string;
  name: string;
  logo: string;
};

const defaultForm: SerieFormState = {
  id: "",
  name: "",
  logo: "",
};

export function AdminPokemonSeriesTable() {
  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PokemonSerieType | null>(null);
  const [serieToDelete, setSerieToDelete] = useState<PokemonSerieType | null>(null);
  const [form, setForm] = useState<SerieFormState>(defaultForm);

  const loadSeries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPokemonSeries();
      setSeries(data);
    } catch (err) {
      console.error("Failed to load series", err);
      setError("Impossible de charger les séries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSeries();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setOpenModal(true);
  };

  const startEdit = (serie: PokemonSerieType) => {
    setEditing(serie);
    setForm({
      id: serie.id ?? "",
      name: serie.name ?? "",
      logo: serie.logo ?? "",
    });
    setOpenModal(true);
  };

  const saveSerie = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      toast.error("Id et nom sont obligatoires");
      return;
    }

    const payload: PokemonSeriePayload = {
      id: form.id.trim(),
      name: form.name.trim(),
      logo: form.logo.trim() || undefined,
    };

    try {
      if (editing) {
        await adminService.updatePokemonSerie(editing.id, {
          name: payload.name,
          logo: payload.logo,
        });
        toast.success("Série mise à jour");
      } else {
        await adminService.createPokemonSerie(payload);
        toast.success("Série créée");
      }
      setOpenModal(false);
      setForm(defaultForm);
      await loadSeries();
    } catch (err) {
      console.error("Unable to save serie", err);
      toast.error("Enregistrement impossible");
    }
  };

  const confirmDelete = async () => {
    if (!serieToDelete) return;
    try {
      await adminService.deletePokemonSerie(serieToDelete.id);
      toast.success("Série supprimée");
      setSerieToDelete(null);
      await loadSeries();
    } catch (err) {
      console.error("Unable to delete serie", err);
      toast.error("Suppression impossible");
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Séries</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créer, modifier ou supprimer des séries Pokémon.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle série
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
                <TableHead>Logo</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Spinner size="small" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                series.map((serie) => (
                  <TableRow key={serie.id}>
                    <TableCell className="font-mono text-xs">{serie.id}</TableCell>
                    <TableCell className="font-semibold">{serie.name}</TableCell>
                    <TableCell>
                      {serie.logo ? (
                        <span className="text-blue-600 underline">{serie.logo}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(serie)}
                        aria-label={`Modifier ${serie.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSerieToDelete(serie)}
                        aria-label={`Supprimer ${serie.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && series.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Aucune série pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier une série" : "Ajouter une série"}
            </DialogTitle>
            <DialogDescription>
              Définissez l'identifiant unique et les métadonnées principales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="serie-id">Id</Label>
              <Input
                id="serie-id"
                value={form.id}
                disabled={Boolean(editing)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, id: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serie-name">Nom</Label>
              <Input
                id="serie-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serie-logo">Logo (URL)</Label>
              <Input
                id="serie-logo"
                value={form.logo}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, logo: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveSerie}>
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(serieToDelete)}
        onOpenChange={(open) => {
          if (!open) setSerieToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette série ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSerieToDelete(null)}>
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
