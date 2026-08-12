"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin.service";
import {
  CreateTournamentDto,
  Tournament,
  TournamentStatus,
  TournamentType,
} from "@/types/tournament";
import { PaginatedResult } from "@/types/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { CalendarClock, Plus, Trash } from "lucide-react";
import { format } from "date-fns";

interface TournamentFormState {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  type: TournamentType | string;
  status: TournamentStatus;
  maxPlayers?: number;
  isExternal: boolean;
  externalRegistrationUrl: string;
}

const defaultForm: TournamentFormState = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  type: TournamentType.SINGLE_ELIMINATION,
  status: TournamentStatus.DRAFT,
  maxPlayers: undefined,
  isExternal: false,
  externalRegistrationUrl: "",
};

const statusKeys: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: "statusDraft",
  [TournamentStatus.REGISTRATION_OPEN]: "statusRegistrationOpen",
  [TournamentStatus.REGISTRATION_CLOSED]: "statusRegistrationClosed",
  [TournamentStatus.IN_PROGRESS]: "statusInProgress",
  [TournamentStatus.FINISHED]: "statusFinished",
  [TournamentStatus.CANCELLED]: "statusCancelled",
};

const statusTransitions: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.DRAFT]: [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.REGISTRATION_OPEN]: [
    TournamentStatus.REGISTRATION_CLOSED,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.REGISTRATION_CLOSED]: [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.IN_PROGRESS]: [TournamentStatus.CANCELLED],
  [TournamentStatus.FINISHED]: [],
  [TournamentStatus.CANCELLED]: [],
};

const getStatusTransitions = (status: string): TournamentStatus[] =>
  statusTransitions[status as TournamentStatus] ?? [];

export function AdminTournamentsTable() {
  const t = useTranslations("AdminTournaments");
  const [data, setData] = useState<PaginatedResult<Tournament> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<TournamentFormState>(defaultForm);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [tournamentToDelete, setTournamentToDelete] =
    useState<Tournament | null>(null);

  const loadTournaments = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getTournaments({ page, limit: 10 });
      setData(response);
    } catch (err) {
      console.error("Failed to load tournaments", err);
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTournaments();
  }, []);

  const openCreate = () => {
    setEditing(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      ...defaultForm,
      startDate: today,
      endDate: today,
    });
    setOpenModal(true);
  };

  const openEdit = (tournament: Tournament) => {
    setEditing(tournament);
    setForm({
      name: tournament.name,
      location: tournament.location ?? "",
      startDate: tournament.startDate?.slice(0, 10) ?? "",
      endDate: tournament.endDate?.slice(0, 10) ?? "",
      type: tournament.type,
      status: (tournament.status as TournamentStatus) ?? TournamentStatus.DRAFT,
      maxPlayers: tournament.maxPlayers,
      isExternal: tournament.isExternal ?? false,
      externalRegistrationUrl: tournament.externalRegistrationUrl ?? "",
    });
    setOpenModal(true);
  };

  const saveTournament = async () => {
    const start = new Date(form.startDate);
    let end = new Date(form.endDate);

    if (end <= start) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    const payload: CreateTournamentDto = {
      name: form.name,
      location: form.location,
      startDate: start,
      endDate: end,
      type: form.type,
      maxPlayers: form.maxPlayers,
      isPublic: true,
      isExternal: form.isExternal,
      externalRegistrationUrl: form.isExternal
        ? form.externalRegistrationUrl
        : undefined,
    };

    try {
      if (editing) {
        await adminService.updateTournament(editing.id, payload);
        toast.success(t("updated"));
      } else {
        await adminService.createTournament(payload);
        toast.success(t("created"));
      }
      setOpenModal(false);
      await loadTournaments(data?.meta.currentPage ?? 1);
    } catch (err) {
      console.error("Unable to save tournament", err);
      toast.error("Enregistrement impossible");
    }
  };

  const updateStatus = async (
    tournament: Tournament,
    status: TournamentStatus,
  ) => {
    try {
      await adminService.updateTournamentStatus(tournament.id, status);
      toast.success(t("statusUpdated"));
      await loadTournaments(data?.meta.currentPage ?? 1);
    } catch (err) {
      console.error("Status update failed", err);
      toast.error(t("updateFailed"));
    }
  };

  const confirmDelete = async () => {
    if (!tournamentToDelete) return;
    try {
      await adminService.deleteTournament(tournamentToDelete.id);
      toast.success(t("deleted"));
      setTournamentToDelete(null);
      await loadTournaments();
    } catch (err) {
      console.error("Deletion failed", err);
      toast.error("Suppression impossible");
    }
  };

  const sortedTournaments = useMemo(() => data?.data ?? [], [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau tournoi
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
                <TableHead>#</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("dates")}</TableHead>
                <TableHead>{t("players")}</TableHead>
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
                sortedTournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">
                      {tournament.id}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {tournament.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      {String(tournament.type).replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(tournament.status)}
                        disabled={
                          getStatusTransitions(tournament.status).length === 0
                        }
                        onValueChange={(value) =>
                          updateStatus(tournament, value as TournamentStatus)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            tournament.status as TournamentStatus,
                            ...getStatusTransitions(tournament.status),
                          ].map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(statusKeys[status])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          {format(new Date(tournament.startDate), "dd/MM/yyyy")}{" "}
                          - {format(new Date(tournament.endDate), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tournament.players?.length ?? 0}
                        {tournament.maxPlayers
                          ? ` / ${tournament.maxPlayers}`
                          : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(tournament)}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTournamentToDelete(tournament)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && sortedTournaments.length === 0 && (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("updateTournament") : "Nouveau tournoi"}
            </DialogTitle>
            <DialogDescription>{t("formSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t("location")}</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">{t("start")}</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">{t("end")}</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("type")}</Label>
              <Select
                value={String(form.type)}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    type: value as TournamentType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TournamentType).map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      disabled={
                        !form.isExternal &&
                        type !== TournamentType.SINGLE_ELIMINATION
                      }
                    >
                      {type.replaceAll("_", " ")}
                      {!form.isExternal &&
                      type !== TournamentType.SINGLE_ELIMINATION
                        ? " — bientôt disponible"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("status")}</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3">
                <Badge variant="secondary">{t(statusKeys[form.status])}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t("statusHelp")}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPlayers">{t("maxPlayers")}</Label>
              <Input
                id="maxPlayers"
                type="number"
                value={form.maxPlayers ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxPlayers: event.target.value
                      ? Number.parseInt(event.target.value, 10)
                      : undefined,
                  }))
                }
              />
            </div>
            <div className="grid gap-2 items-center flex-row justify-between col-span-1 md:col-span-2 border p-3 rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="isExternal" className="font-semibold">
                  Tournoi externe
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("externalRegistrations")}
                </p>
              </div>
              <Switch
                id="isExternal"
                checked={form.isExternal}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    isExternal: checked,
                    type: checked
                      ? prev.type
                      : TournamentType.SINGLE_ELIMINATION,
                  }))
                }
              />
            </div>
            {form.isExternal && (
              <div className="grid gap-2 col-span-1 md:col-span-2">
                <Label htmlFor="externalRegistrationUrl">
                  Lien d'inscription externe
                </Label>
                <Input
                  id="externalRegistrationUrl"
                  type="url"
                  placeholder="https://example.com/register"
                  value={form.externalRegistrationUrl}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      externalRegistrationUrl: event.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveTournament}>
              {editing ? t("update") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(tournamentToDelete)}
        onOpenChange={(open) => {
          if (!open) setTournamentToDelete(null);
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
            <AlertDialogCancel onClick={() => setTournamentToDelete(null)}>
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
