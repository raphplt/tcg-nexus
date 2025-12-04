"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Play,
  Square,
  X,
  SkipForward,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Tournament } from "@/types/tournament";
import { useTournament } from "@/hooks/useTournament";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface TournamentControlsProps {
  tournament: Tournament;
}

interface ActionConfig {
  action: string;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "destructive" | "outline" | "secondary";
  description: string;
  requiresConfirmation: boolean;
}

export function TournamentControls({ tournament }: TournamentControlsProps) {
  const { user } = useAuth();
  const permissions = usePermissions(user, tournament);
  const {
    startTournament,
    finishTournament,
    cancelTournament,
    advanceRound,
    updateStatus,
    transitions,
    isStarting,
    isFinishing,
    isCancelling,
    isAdvancing,
    isUpdatingStatus,
  } = useTournament(tournament.id.toString());

  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>({});

  // Configuration des actions disponibles selon l'état
  const getAvailableActions = (): ActionConfig[] => {
    const actions: ActionConfig[] = [];

    switch (tournament.status) {
      case "draft":
        if (permissions.canManageTournament) {
          actions.push({
            action: "open-registration",
            label: "Ouvrir les inscriptions",
            icon: <Play className="w-4 h-4" />,
            variant: "default",
            description: "Permettre aux joueurs de s'inscrire au tournoi",
            requiresConfirmation: false,
          });
        }
        break;

      case "registration_open":
        if (permissions.canManageTournament) {
          actions.push({
            action: "close-registration",
            label: "Fermer les inscriptions",
            icon: <Square className="w-4 h-4" />,
            variant: "outline",
            description: "Arrêter les nouvelles inscriptions",
            requiresConfirmation: false,
          });
        }
        break;

      case "registration_closed":
        if (permissions.canStartTournament) {
          actions.push({
            action: "start-tournament",
            label: "Démarrer le tournoi",
            icon: <Play className="w-4 h-4" />,
            variant: "default",
            description: "Générer le bracket et commencer les matches",
            requiresConfirmation: true,
          });
          actions.push({
            action: "reopen-registration",
            label: "Rouvrir les inscriptions",
            icon: <Clock className="w-4 h-4" />,
            variant: "outline",
            description: "Permettre de nouvelles inscriptions",
            requiresConfirmation: false,
          });
        }
        break;

      case "in_progress":
        if (permissions.canManageTournament) {
          // Vérifier si on peut passer au round suivant
          const currentRound = tournament.currentRound || 1;
          const totalRounds = tournament.totalRounds || 1;
          const currentRoundMatches =
            tournament.matches?.filter((m) => m.round === currentRound) || [];
          const allCurrentRoundFinished =
            currentRoundMatches.length > 0 &&
            currentRoundMatches.every(
              (m) => m.status === "finished" || m.status === "forfeit",
            );

          // Afficher le bouton "Passer au round suivant" si :
          // - Tous les matches du round actuel sont terminés
          // - Ce n'est pas le dernier round
          if (allCurrentRoundFinished && currentRound < totalRounds) {
            actions.push({
              action: "advance-round",
              label: `Passer au Round ${currentRound + 1}`,
              icon: <SkipForward className="w-4 h-4" />,
              variant: "default",
              description: `Générer les matches du round ${currentRound + 1}/${totalRounds}`,
              requiresConfirmation: true,
            });
          }

          actions.push({
            action: "finish-tournament",
            label: "Terminer le tournoi",
            icon: <CheckCircle className="w-4 h-4" />,
            variant: "outline",
            description: "Finaliser le tournoi et calculer les résultats",
            requiresConfirmation: true,
          });
        }
        break;
    }

    // Action d'annulation toujours disponible (sauf si terminé)
    if (
      tournament.status !== "finished" &&
      tournament.status !== "cancelled" &&
      permissions.canCancelTournament
    ) {
      actions.push({
        action: "cancel-tournament",
        label: "Annuler le tournoi",
        icon: <X className="w-4 h-4" />,
        variant: "destructive",
        description: "Annuler définitivement le tournoi",
        requiresConfirmation: true,
      });
    }

    return actions;
  };

  const handleAction = async (action: string) => {
    switch (action) {
      case "open-registration":
        updateStatus("registration_open");
        break;
      case "close-registration":
        updateStatus("registration_closed");
        break;
      case "reopen-registration":
        updateStatus("registration_open");
        break;
      case "start-tournament":
        startTournament(actionData.startOptions);
        break;
      case "advance-round":
        advanceRound();
        break;
      case "finish-tournament":
        finishTournament();
        break;
      case "cancel-tournament":
        cancelTournament(actionData.reason);
        break;
    }
    setConfirmAction(null);
    setActionData({});
  };

  const getStatusInfo = () => {
    const statusConfig = {
      draft: {
        color: "bg-gray-100 text-gray-800",
        icon: <Settings className="w-4 h-4" />,
      },
      registration_open: {
        color: "bg-green-100 text-green-800",
        icon: <Play className="w-4 h-4" />,
      },
      registration_closed: {
        color: "bg-yellow-100 text-yellow-800",
        icon: <Clock className="w-4 h-4" />,
      },
      in_progress: {
        color: "bg-blue-100 text-blue-800",
        icon: <Play className="w-4 h-4" />,
      },
      finished: {
        color: "bg-purple-100 text-purple-800",
        icon: <CheckCircle className="w-4 h-4" />,
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        icon: <X className="w-4 h-4" />,
      },
    };

    return (
      statusConfig[tournament.status as keyof typeof statusConfig] ||
      statusConfig.draft
    );
  };

  const actions = getAvailableActions();
  const statusInfo = getStatusInfo();
  const isLoading =
    isStarting ||
    isFinishing ||
    isCancelling ||
    isAdvancing ||
    isUpdatingStatus;

  if (!permissions.canViewAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Contrôles du tournoi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statut actuel */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut :</span>
            <Badge className={statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1 capitalize">
                {tournament.status.replace("_", " ")}
              </span>
            </Badge>
          </div>

          {/* Actions disponibles */}
          <div className="space-y-2">
            {actions.length > 0 ? (
              actions.map((actionConfig) => (
                <Button
                  key={actionConfig.action}
                  variant={actionConfig.variant}
                  className="w-full justify-start"
                  disabled={isLoading}
                  onClick={() => {
                    if (actionConfig.requiresConfirmation) {
                      setConfirmAction(actionConfig.action);
                    } else {
                      handleAction(actionConfig.action);
                    }
                  }}
                >
                  {actionConfig.icon}
                  <span className="ml-2">{actionConfig.label}</span>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune action disponible pour le moment
              </p>
            )}
          </div>

          {/* Informations de progression */}
          {tournament.status === "in_progress" && (
            <div className="pt-4 border-t">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Round actuel :</span>
                  <span className="font-medium">
                    {tournament.currentRound}/{tournament.totalRounds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Matches :</span>
                  <span className="font-medium">
                    {tournament.matches?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Joueurs :</span>
                  <span className="font-medium">
                    {tournament.players?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales de confirmation */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirmer l'action
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "start-tournament" && (
                <div className="space-y-4">
                  <p>
                    Êtes-vous sûr de vouloir démarrer le tournoi ? Cette action
                    générera le bracket et ne pourra pas être annulée.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="seeding-method">Méthode de seeding :</Label>
                    <Select
                      value={actionData.startOptions?.seedingMethod || "random"}
                      onValueChange={(value) =>
                        setActionData({
                          ...actionData,
                          startOptions: {
                            ...actionData.startOptions,
                            seedingMethod: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">Aléatoire</SelectItem>
                        <SelectItem value="ranking">Par classement</SelectItem>
                        <SelectItem value="elo">Par ELO</SelectItem>
                        <SelectItem value="manual">Manuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {confirmAction === "advance-round" && (
                <p>
                  Passer au round suivant ? Assurez-vous que tous les matches du
                  round actuel sont terminés.
                </p>
              )}

              {confirmAction === "finish-tournament" && (
                <p>
                  Terminer le tournoi ? Les classements finaux seront calculés
                  et le tournoi sera marqué comme terminé.
                </p>
              )}

              {confirmAction === "cancel-tournament" && (
                <div className="space-y-4">
                  <p>Annuler le tournoi ? Cette action est irréversible.</p>

                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason">
                      Raison (optionnelle) :
                    </Label>
                    <Textarea
                      id="cancel-reason"
                      placeholder="Expliquez pourquoi le tournoi est annulé..."
                      value={actionData.reason || ""}
                      onChange={(e) =>
                        setActionData({ ...actionData, reason: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction(confirmAction!)}
              disabled={isLoading}
              className={
                confirmAction === "cancel-tournament"
                  ? "bg-destructive hover:bg-destructive/90"
                  : ""
              }
            >
              {isLoading ? "En cours..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
