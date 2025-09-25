"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Users,
  Search,
  Download,
  CheckCircle,
  X,
  Clock,
  UserCheck,
  UserX,
  Filter,
} from "lucide-react";
import { tournamentService } from "@/services/tournament.service";
import { TournamentRegistration } from "@/types/tournament";
import { toast } from "sonner";

interface RegistrationManagerProps {
  tournamentId: number;
}

export function RegistrationManager({ tournamentId }: RegistrationManagerProps) {
  const queryClient = useQueryClient();
  const [selectedRegistrations, setSelectedRegistrations] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    checkedIn: "",
  });
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  // Données des inscriptions
  const {
    data: registrations = [],
    isLoading,
    error,
  } = useQuery<TournamentRegistration[]>({
    queryKey: ["tournament", tournamentId, "registrations"],
    queryFn: () => tournamentService.getRegistrations(tournamentId),
    enabled: !!tournamentId,
  });

  // Mutations pour les actions
  const confirmMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.confirmRegistration(tournamentId, registrationId),
    onSuccess: () => {
      toast.success("Inscription confirmée !");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ registrationId, reason }: { registrationId: number; reason?: string }) =>
      tournamentService.cancelRegistration(tournamentId, registrationId, reason),
    onSuccess: () => {
      toast.success("Inscription annulée");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (registrationId: number) =>
      tournamentService.checkIn(tournamentId, registrationId),
    onSuccess: () => {
      toast.success("Check-in effectué !");
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
    onError: (error: any) => {
      toast.error(`Erreur : ${error.response?.data?.message || error.message}`);
    },
  });

  // Filtrage des inscriptions
  const filteredRegistrations = registrations.filter((reg) => {
    if (filters.status && reg.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!reg.player.name.toLowerCase().includes(searchLower)) return false;
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

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
  };

  const executeBulkAction = () => {
    if (!bulkAction || selectedRegistrations.length === 0) return;

    selectedRegistrations.forEach((regId) => {
      switch (bulkAction) {
        case "confirm":
          confirmMutation.mutate(regId);
          break;
        case "cancel":
          cancelMutation.mutate({ registrationId: regId, reason: "Action groupée" });
          break;
        case "checkin":
          checkInMutation.mutate(regId);
          break;
      }
    });

    setSelectedRegistrations([]);
    setBulkAction(null);
  };

  const exportRegistrations = () => {
    const csv = [
      ["Joueur", "Statut", "Check-in", "Inscription", "Notes"].join(","),
      ...filteredRegistrations.map((reg) => [
        reg.player.name,
        reg.status,
        reg.checkedIn ? "Oui" : "Non",
        new Date(reg.registeredAt).toLocaleDateString(),
        reg.notes || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions-tournoi-${tournamentId}-${new Date().toISOString().split('T')[0]}.csv`;
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
        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
              <div className="text-sm text-muted-foreground">Confirmées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.checkedIn}</div>
              <div className="text-sm text-muted-foreground">Check-in</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
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
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check-in</Label>
                <Select value={filters.checkedIn} onValueChange={(value) => setFilters({ ...filters, checkedIn: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="true">Check-in fait</SelectItem>
                    <SelectItem value="false">Check-in manquant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({ status: "", search: "", checkedIn: "" })}
                  className="w-full"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>

            {/* Actions bulk */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedRegistrations.length} sélectionnée(s)
              </span>
              
              {selectedRegistrations.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("confirm")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmer ({selectedRegistrations.length})
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("cancel")}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction("checkin")}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Check-in
                  </Button>
                </>
              )}

              <div className="ml-auto">
                <Button variant="outline" size="sm" onClick={exportRegistrations}>
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
                      checked={selectedRegistrations.length === filteredRegistrations.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRegistrations(filteredRegistrations.map(r => r.id));
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
                          checked={selectedRegistrations.includes(registration.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRegistrations([...selectedRegistrations, registration.id]);
                            } else {
                              setSelectedRegistrations(selectedRegistrations.filter(id => id !== registration.id));
                            }
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {registration.player.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{registration.player.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {registration.player.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>{getStatusBadge(registration.status)}</TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {registration.checkedIn ? (
                            <>
                              <UserCheck className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600">
                                {registration.checkedInAt && formatDate(registration.checkedInAt)}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-muted-foreground">Non</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">{formatDate(registration.registeredAt)}</span>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {registration.notes || "-"}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          {registration.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmMutation.mutate(registration.id)}
                              disabled={confirmMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {registration.status === "confirmed" && !registration.checkedIn && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkInMutation.mutate(registration.id)}
                              disabled={checkInMutation.isPending}
                            >
                              <UserCheck className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {registration.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const reason = prompt("Raison de l'annulation (optionnelle) :");
                                cancelMutation.mutate({ registrationId: registration.id, reason: reason || undefined });
                              }}
                              disabled={cancelMutation.isPending}
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
              {bulkAction === "checkin" && (
                <p>Effectuer le check-in pour {selectedRegistrations.length} joueur(s) ?</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
