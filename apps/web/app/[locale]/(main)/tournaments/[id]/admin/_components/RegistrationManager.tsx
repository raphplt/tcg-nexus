"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Download,
  Filter,
  Search,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tournamentService } from "@/services/tournament.service";
import { TournamentRegistration } from "@/types/tournament";
import { extractApiErrorMessage } from "@/utils/api-error";

type BulkAction = "confirm" | "cancel" | "check_in";

// Helper function to get player display name
const getPlayerName = (registration: TournamentRegistration): string => {
  const player = registration.player;
  if (player?.user) {
    return `${player.user.firstName || ""} ${player.user.lastName || ""}`.trim();
  }
  return player?.name || `Joueur #${player?.id || "?"}`;
};

const getPlayerInitials = (registration: TournamentRegistration): string => {
  const player = registration.player;
  if (player?.user) {
    return `${player.user.firstName?.[0] || ""}${player.user.lastName?.[0] || ""}`.toUpperCase();
  }
  return player?.name?.slice(0, 2)?.toUpperCase() || "??";
};

interface RegistrationManagerProps {
  tournamentId: number;
  tournamentStatus: string;
}

export function RegistrationManager({
  tournamentId,
  tournamentStatus,
}: RegistrationManagerProps) {
  const queryClient = useQueryClient();
  const [selectedRegistrations, setSelectedRegistrations] = useState<number[]>(
    [],
  );
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    checkedIn: "",
  });
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [registrationToCancel, setRegistrationToCancel] = useState<
    number | null
  >(null);
  const [showCheckInAllDialog, setShowCheckInAllDialog] = useState(false);
  const canManageRegistrations =
    tournamentStatus === "registration_open" ||
    tournamentStatus === "registration_closed";
  const refreshTournamentQueries = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournamentId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["tournament", String(tournamentId)],
      }),
      queryClient.invalidateQueries({
        queryKey: ["tournament", tournamentId, "registrations"],
      }),
    ]);

  // Données des inscriptions
  const { data: registrations = [], isLoading } = useQuery<
    TournamentRegistration[]
  >({
    queryKey: ["tournament", tournamentId, "registrations"],
    queryFn: () => tournamentService.getRegistrations(tournamentId),
    enabled: !!tournamentId,
  });

  // Mutations pour les actions
  const confirmMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.confirmRegistration(tournamentId, registrationId),
    onSuccess: async () => {
      toast.success("Inscription confirmée !");
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible de confirmer l'inscription."),
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({
      registrationId,
      reason,
    }: {
      registrationId: number;
      reason?: string;
    }) =>
      tournamentService.cancelRegistration(
        tournamentId,
        registrationId,
        reason,
      ),
    onSuccess: async () => {
      toast.success("Inscription annulée");
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible d'annuler l'inscription."),
      );
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.checkIn(tournamentId, registrationId),
    onSuccess: async () => {
      toast.success("Check-in effectué !");
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(error, "Impossible d'effectuer le check-in."),
      );
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (action: BulkAction) =>
      tournamentService.updateRegistrationsInBulk(tournamentId, {
        registrationIds: selectedRegistrations,
        action,
      }),
    onSuccess: async (result) => {
      const labels: Record<BulkAction, string> = {
        confirm: "confirmée(s)",
        cancel: "annulée(s)",
        check_in: "enregistrée(s) au check-in",
      };
      toast.success(
        `${result.updatedCount} inscription(s) ${labels[result.action]}${
          result.promotedCount > 0
            ? ` ${result.promotedCount} joueur(s) promu(s) depuis la liste d'attente.`
            : ""
        }`,
      );
      setSelectedRegistrations([]);
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(
          error,
          "L'action groupée n'a pas pu être appliquée.",
        ),
      );
    },
  });

  const checkInAllMutation = useMutation({
    mutationFn: () => tournamentService.checkInAllPlayers(tournamentId),
    onSuccess: async (result) => {
      setShowCheckInAllDialog(false);
      toast.success(
        `${result.checkedInCount} joueur(s) enregistré(s) au check-in.`,
      );
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        extractApiErrorMessage(
          error,
          "Le check-in global n'a pas pu être effectué.",
        ),
      );
    },
  });

  // Filtrage des inscriptions
  const filteredRegistrations = registrations.filter((reg) => {
    if (filters.status && reg.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const playerName = getPlayerName(reg);
      if (!playerName.toLowerCase().includes(searchLower)) return false;
    }
    if (filters.checkedIn) {
      if (filters.checkedIn === "true" && !reg.checkedIn) return false;
      if (filters.checkedIn === "false" && reg.checkedIn) return false;
    }
    return true;
  });

  // Statistiques
  const stats = {
    total: registrations.length,
    confirmed: registrations.filter((r) => r.status === "confirmed").length,
    pending: registrations.filter((r) => r.status === "pending").length,
    waitlisted: registrations.filter((r) => r.status === "waitlisted").length,
    cancelled: registrations.filter((r) => r.status === "cancelled").length,
    checkedIn: registrations.filter((r) => r.checkedIn).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default">Confirmée</Badge>;
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annulée</Badge>;
      case "waitlisted":
        return <Badge variant="outline">Liste d'attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedRegistrationRecords = registrations.filter((registration) =>
    selectedRegistrations.includes(registration.id),
  );
  const canConfirmSelection =
    selectedRegistrationRecords.length > 0 &&
    selectedRegistrationRecords.every(
      (registration) =>
        registration.status === "pending" ||
        registration.status === "waitlisted" ||
        registration.status === "cancelled",
    );
  const canCancelSelection =
    selectedRegistrationRecords.length > 0 &&
    selectedRegistrationRecords.every(
      (registration) =>
        registration.status !== "cancelled" &&
        registration.status !== "eliminated",
    );
  const canCheckInSelection =
    selectedRegistrationRecords.length > 0 &&
    selectedRegistrationRecords.every(
      (registration) =>
        registration.status === "confirmed" && !registration.checkedIn,
    );
  const uncheckedConfirmedCount = registrations.filter(
    (registration) =>
      registration.status === "confirmed" && !registration.checkedIn,
  ).length;

  const handleBulkAction = (action: BulkAction) => {
    setBulkAction(action);
  };

  const updateFilters = (nextFilters: typeof filters) => {
    setFilters(nextFilters);
    setSelectedRegistrations([]);
  };

  const executeBulkAction = () => {
    if (!bulkAction || selectedRegistrations.length === 0) return;

    bulkMutation.mutate(bulkAction);
    setBulkAction(null);
  };

  const exportRegistrations = () => {
    const escapeCsvCell = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const csv = [
      ["Joueur", "Statut", "Check-in", "Inscription", "Notes"]
        .map(escapeCsvCell)
        .join(","),
      ...filteredRegistrations.map((reg) =>
        [
          getPlayerName(reg),
          reg.status,
          reg.checkedIn ? "Oui" : "Non",
          new Date(reg.registeredAt).toLocaleDateString(),
          reg.notes || "",
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions-tournoi-${tournamentId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {!canManageRegistrations && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            Les inscriptions sont maintenant en lecture seule. Elles ne peuvent
            plus être modifiées après le démarrage ou l’annulation du tournoi.
          </div>
        )}

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.confirmed}
              </div>
              <div className="text-sm text-muted-foreground">Confirmées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending}
              </div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.waitlisted}
              </div>
              <div className="text-sm text-muted-foreground">
                Liste d’attente
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.checkedIn}
              </div>
              <div className="text-sm text-muted-foreground">Check-in</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.cancelled}
              </div>
              <div className="text-sm text-muted-foreground">Annulées</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres et actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Nom du joueur..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) =>
                      updateFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    updateFilters({
                      ...filters,
                      status: value === "all" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="waitlisted">Liste d’attente</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                    <SelectItem value="eliminated">Éliminées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check-in</Label>
                <Select
                  value={filters.checkedIn || "all"}
                  onValueChange={(value) =>
                    updateFilters({
                      ...filters,
                      checkedIn: value === "all" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="true">Check-in fait</SelectItem>
                    <SelectItem value="false">Check-in manquant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    updateFilters({ status: "", search: "", checkedIn: "" })
                  }
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>

            {/* Actions bulk */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedRegistrations.length} sélectionnée(s)
              </span>

              {selectedRegistrations.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("confirm")}
                    disabled={
                      !canManageRegistrations ||
                      !canConfirmSelection ||
                      bulkMutation.isPending
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer ({selectedRegistrations.length})
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("cancel")}
                    disabled={
                      !canManageRegistrations ||
                      !canCancelSelection ||
                      bulkMutation.isPending
                    }
                  >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("check_in")}
                    disabled={
                      !canManageRegistrations ||
                      !canCheckInSelection ||
                      bulkMutation.isPending
                    }
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Check-in
                  </Button>
                </>
              )}

              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {uncheckedConfirmedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCheckInAllDialog(true)}
                    disabled={
                      !canManageRegistrations || checkInAllMutation.isPending
                    }
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Check-in des absents ({uncheckedConfirmedCount})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportRegistrations}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des inscriptions */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      disabled={!canManageRegistrations}
                      checked={
                        filteredRegistrations.length > 0 &&
                        selectedRegistrations.length ===
                          filteredRegistrations.length
                      }
                      aria-label="Sélectionner toutes les inscriptions filtrées"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRegistrations(
                            filteredRegistrations.map((r) => r.id),
                          );
                        } else {
                          setSelectedRegistrations([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length > 0 ? (
                  filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell>
                        <Checkbox
                          disabled={!canManageRegistrations}
                          aria-label={`Sélectionner l'inscription de ${getPlayerName(
                            registration,
                          )}`}
                          checked={selectedRegistrations.includes(
                            registration.id,
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRegistrations([
                                ...selectedRegistrations,
                                registration.id,
                              ]);
                            } else {
                              setSelectedRegistrations(
                                selectedRegistrations.filter(
                                  (id) => id !== registration.id,
                                ),
                              );
                            }
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {getPlayerInitials(registration)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getPlayerName(registration)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {registration.player?.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(registration.status)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {registration.checkedIn ? (
                            <>
                              <UserCheck className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600">
                                {registration.checkedInAt &&
                                  formatDate(registration.checkedInAt)}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-muted-foreground">
                                Non
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm">
                          {formatDate(registration.registeredAt)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {registration.notes || "-"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-1">
                          {(registration.status === "pending" ||
                            registration.status === "waitlisted") && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Confirmer l'inscription de ${getPlayerName(
                                registration,
                              )}`}
                              title="Confirmer l'inscription"
                              onClick={() =>
                                confirmMutation.mutate(registration.id)
                              }
                              disabled={
                                !canManageRegistrations ||
                                confirmMutation.isPending
                              }
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}

                          {registration.status === "confirmed" &&
                            !registration.checkedIn && (
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Effectuer le check-in de ${getPlayerName(
                                  registration,
                                )}`}
                                title="Effectuer le check-in"
                                onClick={() =>
                                  checkInMutation.mutate(registration.id)
                                }
                                disabled={
                                  !canManageRegistrations ||
                                  checkInMutation.isPending
                                }
                              >
                                <UserCheck className="w-3 h-3" />
                              </Button>
                            )}

                          {registration.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Annuler l'inscription de ${getPlayerName(
                                registration,
                              )}`}
                              title="Annuler l'inscription"
                              onClick={() =>
                                setRegistrationToCancel(registration.id)
                              }
                              disabled={
                                !canManageRegistrations ||
                                cancelMutation.isPending
                              }
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Aucune inscription trouvée</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation pour actions bulk */}
      <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action groupée</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "confirm" && (
                <p>Confirmer {selectedRegistrations.length} inscription(s) ?</p>
              )}
              {bulkAction === "cancel" && (
                <p>Annuler {selectedRegistrations.length} inscription(s) ?</p>
              )}
              {bulkAction === "check_in" && (
                <p>
                  Effectuer le check-in pour {selectedRegistrations.length}{" "}
                  joueur(s) ?
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkAction}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? "Application..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showCheckInAllDialog}
        onOpenChange={setShowCheckInAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effectuer le check-in global ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {uncheckedConfirmedCount} participant(s) confirmé(s) sans
              check-in seront enregistrés en une seule opération.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkInAllMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                checkInAllMutation.mutate();
              }}
              disabled={checkInAllMutation.isPending}
            >
              {checkInAllMutation.isPending
                ? "Enregistrement…"
                : "Confirmer le check-in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={registrationToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setRegistrationToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette inscription ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le joueur sera retiré des participants confirmés et devra se
              réinscrire pour participer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver l’inscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (registrationToCancel === null) return;
                cancelMutation.mutate({
                  registrationId: registrationToCancel,
                });
                setRegistrationToCancel(null);
              }}
            >
              Annuler l’inscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
