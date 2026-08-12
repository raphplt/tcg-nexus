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
import { translateApiError } from "@/utils/api-error";
import { useLocale, useTranslations } from "next-intl";

type BulkAction = "confirm" | "cancel" | "check_in";

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
  const t = useTranslations("RegistrationManager");
  const tError = useTranslations("ApiErrors");
  const locale = useLocale();
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

  const { data: registrations = [], isLoading } = useQuery<
    TournamentRegistration[]
  >({
    queryKey: ["tournament", tournamentId, "registrations"],
    queryFn: () => tournamentService.getRegistrations(tournamentId),
    enabled: !!tournamentId,
  });

  const confirmMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.confirmRegistration(tournamentId, registrationId),
    onSuccess: async () => {
      toast.success(t("confirmed"));
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(translateApiError(error, tError, t("confirmError")));
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
      toast.success(t("cancelled"));
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(
        translateApiError(error, tError, "Impossible d'annuler l'inscription."),
      );
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.checkIn(tournamentId, registrationId),
    onSuccess: async () => {
      toast.success(t("checkedIn"));
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(translateApiError(error, tError, t("checkInError")));
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (action: BulkAction) =>
      tournamentService.updateRegistrationsInBulk(tournamentId, {
        registrationIds: selectedRegistrations,
        action,
      }),
    onSuccess: async (result) => {
      const actionKeys: Record<BulkAction, string> = {
        confirm: "bulkConfirmed",
        cancel: "bulkCancelled",
        check_in: "bulkCheckedIn",
      };
      const summary = t(actionKeys[result.action], {
        count: result.updatedCount,
      });
      toast.success(
        result.promotedCount > 0
          ? `${summary} ${t("bulkPromoted", { count: result.promotedCount })}`
          : summary,
      );
      setSelectedRegistrations([]);
      await refreshTournamentQueries();
    },
    onError: (error: unknown) => {
      toast.error(translateApiError(error, tError, t("bulkActionError")));
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
      toast.error(translateApiError(error, tError, t("globalCheckInError")));
    },
  });

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
        return <Badge variant="default">{t("statusConfirmed")}</Badge>;
      case "pending":
        return <Badge variant="secondary">{t("statusPending")}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t("statusCancelled")}</Badge>;
      case "waitlisted":
        return <Badge variant="outline">{t("waitlist")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString(locale, {
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
      [t("player"), t("status"), t("checkIn"), t("registration"), t("notes")]
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
            {t("readOnlyNotice")}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">{t("total")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.confirmed}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("statusConfirmedPlural")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("statusPending")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.waitlisted}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("waitlistAlt")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.checkedIn}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("checkIn")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.cancelled}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("statusCancelledPlural")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t("filtersAndActions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="search">{t("search")}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("playerPlaceholder")}
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) =>
                      updateFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("status")}</Label>
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
                    <SelectValue placeholder={t("allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="confirmed">
                      {t("statusConfirmedPlural")}
                    </SelectItem>
                    <SelectItem value="pending">
                      {t("statusPending")}
                    </SelectItem>
                    <SelectItem value="waitlisted">
                      {t("waitlistAlt")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("statusCancelledPlural")}
                    </SelectItem>
                    <SelectItem value="eliminated">
                      {t("eliminatedPlural")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("checkIn")}</Label>
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
                    <SelectValue placeholder={t("all")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all")}</SelectItem>
                    <SelectItem value="true">{t("checkInDone")}</SelectItem>
                    <SelectItem value="false">{t("checkInMissing")}</SelectItem>
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
                  {t("reset")}
                </Button>
              </div>
            </div>

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
                    {t("cancel")}
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
                    {t("checkIn")}
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
                  <TableHead>{t("player")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("checkIn")}</TableHead>
                  <TableHead>{t("registration")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
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
                        <p>{t("empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBulkAction")}</AlertDialogTitle>
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
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
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
            <AlertDialogTitle>{t("globalCheckInConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              Les {uncheckedConfirmedCount} participant(s) confirmé(s) sans
              check-in seront enregistrés en une seule opération.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkInAllMutation.isPending}>
              {t("cancel")}
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
                : t("confirmCheckIn")}
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
            <AlertDialogTitle>{t("cancelConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepRegistration")}</AlertDialogCancel>
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
