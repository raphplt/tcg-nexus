"use client";

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
}

const defaultForm: TournamentFormState = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  type: TournamentType.SINGLE_ELIMINATION,
  status: TournamentStatus.DRAFT,
  maxPlayers: undefined,
};

const statusLabels: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: "Brouillon",
  [TournamentStatus.REGISTRATION_OPEN]: "Inscriptions ouvertes",
  [TournamentStatus.REGISTRATION_CLOSED]: "Inscriptions closes",
  [TournamentStatus.IN_PROGRESS]: "En cours",
  [TournamentStatus.FINISHED]: "Terminé",
  [TournamentStatus.CANCELLED]: "Annulé",
};

export function AdminTournamentsTable() {
  const [data, setData] = useState<PaginatedResult<Tournament> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<TournamentFormState>(defaultForm);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  const loadTournaments = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getTournaments({ page, limit: 10 });
      setData(response);
    } catch (err) {
      console.error("Failed to load tournaments", err);
      setError("Impossible de charger les tournois");
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
      status:
        (tournament.status as TournamentStatus) ?? TournamentStatus.DRAFT,
      maxPlayers: tournament.maxPlayers,
    });
    setOpenModal(true);
  };

  const saveTournament = async () => {
    const payload: CreateTournamentDto = {
      name: form.name,
      location: form.location,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      type: form.type,
      maxPlayers: form.maxPlayers,
      isPublic: true,
    };

    try {
      if (editing) {
        await adminService.updateTournament(editing.id, payload);
        if (form.status !== editing.status) {
          await adminService.updateTournamentStatus(editing.id, form.status);
        }
        toast.success("Tournoi mis à jour");
      } else {
        await adminService.createTournament(payload);
        toast.success("Tournoi créé");
      }
      setOpenModal(false);
      await loadTournaments(data?.meta.currentPage ?? 1);
    } catch (err) {
      console.error("Unable to save tournament", err);
      toast.error("Enregistrement impossible");
    }
  };

  const updateStatus = async (tournament: Tournament, status: TournamentStatus) => {
    try {
      await adminService.updateTournamentStatus(tournament.id, status);
      toast.success("Statut mis à jour");
      await loadTournaments(data?.meta.currentPage ?? 1);
    } catch (err) {
      console.error("Status update failed", err);
      toast.error("Mise à jour impossible");
    }
  };

  const confirmDelete = async () => {
    if (!tournamentToDelete) return;
    try {
      await adminService.deleteTournament(tournamentToDelete.id);
      toast.success("Tournoi supprimé");
      setTournamentToDelete(null);
      await loadTournaments();
    } catch (err) {
      console.error("Deletion failed", err);
      toast.error("Suppression impossible");
    }
  };

  const sortedTournaments = useMemo(
    () => data?.data ?? [],
    [data],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tournois</CardTitle>
          <p className="text-sm text-muted-foreground">
            Créer, mettre à jour ou archiver les tournois.
          </p>
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
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Joueurs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center"
                  >
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
                        onValueChange={(value) =>
                          updateStatus(
                            tournament,
                            value as TournamentStatus,
                          )
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(TournamentStatus).map((status) => (
                            <SelectItem
                              key={status}
                              value={status}
                            >
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          {format(new Date(tournament.startDate), "dd/MM/yyyy")} -{" "}
                          {format(new Date(tournament.endDate), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tournament.players?.length ?? 0}
                        {tournament.maxPlayers ? ` / ${tournament.maxPlayers}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(tournament)}
                      >
                        Éditer
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
                    Aucun tournoi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={openModal}
        onOpenChange={setOpenModal}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Mettre à jour le tournoi" : "Nouveau tournoi"}
            </DialogTitle>
            <DialogDescription>
              Définissez les paramètres essentiels du tournoi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Lieu</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Début</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fin</Label>
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
              <Label>Type</Label>
              <Select
                value={String(form.type)}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, type: value as TournamentType }))
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
                    >
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as TournamentStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TournamentStatus).map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                    >
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPlayers">Joueurs max</Label>
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
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenModal(false)}
            >
              Annuler
            </Button>
            <Button onClick={saveTournament}>
              {editing ? "Mettre à jour" : "Créer"}
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
            <AlertDialogTitle>Supprimer ce tournoi ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le tournoi.
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
