"use client";

import { useTranslations } from "next-intl";
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
import { ImageUpload } from "@/components/ui/ImageUpload";

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
  const t = useTranslations("AdminSeries");
  const [series, setSeries] = useState<PokemonSerieType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PokemonSerieType | null>(null);
  const [serieToDelete, setSerieToDelete] = useState<PokemonSerieType | null>(
    null,
  );
  const [form, setForm] = useState<SerieFormState>(defaultForm);

  const loadSeries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPokemonSeries();
      setSeries(data);
    } catch (err) {
      console.error("Failed to load series", err);
      setError(t("loadError"));
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
      toast.error(t("idAndNameRequired"));
      return;
    }

    const payload: PokemonSeriePayload = {
      id: form.id.trim(),
      name: form.name.trim(),
      logo: form.logo.trim() || "",
    };

    try {
      if (editing) {
        await adminService.updatePokemonSerie(editing.id, {
          name: payload.name,
          logo: payload.logo,
        });
        toast.success(t("updated"));
      } else {
        await adminService.createPokemonSerie(payload);
        toast.success(t("created"));
      }
      setOpenModal(false);
      setForm(defaultForm);
      await loadSeries();
    } catch (err) {
      console.error("Unable to save serie", err);
      toast.error("Enregistrement impossible");
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (!editing) {
      toast.error(t("createFirst"));
      throw new Error(t("createFirst"));
    }
    try {
      const response = await adminService.uploadPokemonSerieLogo(
        editing.id,
        file,
      );
      toast.success(t("logoUploaded"));
      setForm((prev) => ({ ...prev, logo: response.logo || "" }));
      await loadSeries();
      return response.logo || "";
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(t("uploadError"));
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!serieToDelete) return;
    try {
      await adminService.deletePokemonSerie(serieToDelete.id);
      toast.success(t("deleted"));
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
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("newSeries")}
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
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("logo")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
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
                    <TableCell className="font-mono text-xs">
                      {serie.id}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {serie.name}
                    </TableCell>
                    <TableCell>
                      {serie.logo ? (
                        <span className="text-blue-600 underline">
                          {serie.logo}
                        </span>
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
                    {t("empty")}
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
              {editing ? t("editSeries") : t("addSeries")}
            </DialogTitle>
            <DialogDescription>{t("formSubtitle")}</DialogDescription>
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
              <Label htmlFor="serie-name">{t("name")}</Label>
              <Input
                id="serie-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("seriesLogo")}</Label>
              {editing ? (
                <ImageUpload
                  value={form.logo}
                  onChange={(url) =>
                    setForm((prev) => ({ ...prev, logo: url || "" }))
                  }
                  onUpload={handleUploadLogo}
                  label={t("logo")}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {t("createFirstForLogo")}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveSerie}>
              {editing ? t("update") : t("create")}
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
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("irreversible")}</AlertDialogDescription>
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
