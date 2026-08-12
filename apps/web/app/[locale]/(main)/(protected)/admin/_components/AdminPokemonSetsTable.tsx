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
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useLocale, useTranslations } from "next-intl";

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
  const t = useTranslations("AdminSets");
  const locale = useLocale();
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
      setError(t("loadError"));
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
      toast.error(t("requiredFields"));
      return;
    }
    if (!form.serieId.trim()) {
      toast.error(t("seriesRequired"));
      return;
    }

    const payload: PokemonSetPayload = {
      id: form.id.trim(),
      name: form.name.trim(),
      logo: form.logo.trim() || "",
      symbol: form.symbol.trim() || "",
      releaseDate: form.releaseDate,
      tcgOnline: form.tcgOnline.trim() || "",
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
        toast.success(t("updated"));
      } else {
        await adminService.createPokemonSet(payload);
        toast.success(t("created"));
      }
      setOpenModal(false);
      setForm(defaultSetForm);
      await loadSets();
    } catch (err) {
      console.error("Unable to save set", err);
      toast.error("Enregistrement impossible");
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (!editing) {
      toast.error(t("createFirst"));
      throw new Error(t("createFirst"));
    }
    try {
      const response = await adminService.uploadPokemonSetLogo(
        editing.id,
        file,
      );
      toast.success(t("logoUploaded"));
      setForm((prev) => ({ ...prev, logo: response.logo || "" }));
      await loadSets();
      return response.logo || "";
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(t("uploadError"));
      throw err;
    }
  };

  const handleUploadSymbol = async (file: File) => {
    if (!editing) {
      toast.error(t("createFirst"));
      throw new Error(t("createFirst"));
    }
    try {
      const response = await adminService.uploadPokemonSetSymbol(
        editing.id,
        file,
      );
      toast.success(t("symbolUploaded"));
      setForm((prev) => ({ ...prev, symbol: response.symbol || "" }));
      await loadSets();
      return response.symbol || "";
    } catch (err) {
      console.error("Upload failed", err);
      toast.error(t("uploadError"));
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!setToDelete) return;
    try {
      await adminService.deletePokemonSet(setToDelete.id);
      toast.success(t("deleted"));
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("series")}</TableHead>
                <TableHead>{t("releaseDate")}</TableHead>
                <TableHead>{t("cards")}</TableHead>
                <TableHead>{t("legal")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
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
                    <TableCell className="font-mono text-xs">
                      {set.id}
                    </TableCell>
                    <TableCell className="font-semibold">{set.name}</TableCell>
                    <TableCell>{set.serie?.name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {set.releaseDate
                          ? new Date(set.releaseDate).toLocaleDateString(locale)
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
                      <Badge
                        variant={set.legal?.standard ? "default" : "outline"}
                      >
                        {t("standard")}
                      </Badge>
                      <Badge
                        variant={set.legal?.expanded ? "default" : "outline"}
                      >
                        {t("expanded")}
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
                    {t("empty")}
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
            <DialogTitle>{editing ? t("editSet") : "Nouveau set"}</DialogTitle>
            <DialogDescription>{t("formSubtitle")}</DialogDescription>
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
              <Label htmlFor="set-name">{t("name")}</Label>
              <Input
                id="set-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("series")}</Label>
              <Select
                value={form.serieId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, serieId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chooseSeries")} />
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
              <Label htmlFor="set-release">{t("releaseDate")}</Label>
              <Input
                id="set-release"
                type="date"
                value={form.releaseDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    releaseDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("setLogo")}</Label>
              {editing ? (
                <ImageUpload
                  value={form.logo}
                  onChange={(url) =>
                    setForm((prev) => ({ ...prev, logo: url || "" }))
                  }
                  onUpload={handleUploadLogo}
                  label="Logo"
                />
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {t("createFirstForLogo")}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{t("setSymbol")}</Label>
              {editing ? (
                <ImageUpload
                  value={form.symbol}
                  onChange={(url) =>
                    setForm((prev) => ({ ...prev, symbol: url || "" }))
                  }
                  onUpload={handleUploadSymbol}
                  label="Symbole"
                />
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {t("createFirstForSymbol")}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="set-tcg-online">Code TCG Online</Label>
              <Input
                id="set-tcg-online"
                value={form.tcgOnline}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    tcgOnline: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="count-total">{t("totalCards")}</Label>
              <Input
                id="count-total"
                type="number"
                value={form.cardCountTotal}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    cardCountTotal: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="count-official">{t("official")}</Label>
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
                  setForm((prev) => ({
                    ...prev,
                    cardCountHolo: event.target.value,
                  }))
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
                <p className="text-sm font-medium">{t("standard")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("legalStandard")}
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
                <p className="text-sm font-medium">{t("expanded")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("legalExpanded")}
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
            <Button onClick={saveSet}>
              {editing ? t("update") : t("create")}
            </Button>
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
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteWarning")}
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
