"use client";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Play,
  Settings,
  SkipForward,
  Square,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTournament } from "@/hooks/useTournament";
import { Tournament } from "@/types/tournament";
import { tournamentStatusTranslation } from "@/utils/tournaments";

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
  const t = useTranslations("TournamentControls");
  const { user } = useAuth();
  const permissions = usePermissions(user, tournament);
  const {
    startTournament,
    cancelTournament,
    advanceRound,
    updateStatus,
    isStarting,
    isCancelling,
    isAdvancing,
    isUpdatingStatus,
  } = useTournament(tournament.id.toString());

  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>({});
  const hasSupportedEngine =
    !tournament.isExternal && tournament.type === "single_elimination";

  const getAvailableActions = (): ActionConfig[] => {
    const actions: ActionConfig[] = [];

    switch (tournament.status) {
      case "draft":
        if (permissions.canManageTournament) {
          actions.push({
            action: "open-registration",
            label: t("openRegistrations"),
            icon: <Play className="w-4 h-4" />,
            variant: "default",
            description: t("openRegistrationsHelp"),
            requiresConfirmation: false,
          });
        }
        break;

      case "registration_open":
        if (permissions.canManageTournament) {
          actions.push({
            action: "close-registration",
            label: t("closeRegistrations"),
            icon: <Square className="w-4 h-4" />,
            variant: "outline",
            description: t("closeRegistrationsHelp"),
            requiresConfirmation: false,
          });
        }
        break;

      case "registration_closed":
        if (permissions.canStartTournament && hasSupportedEngine) {
          actions.push({
            action: "start-tournament",
            label: t("start"),
            icon: <Play className="w-4 h-4" />,
            variant: "default",
            description: t("startHelp"),
            requiresConfirmation: true,
          });
        }
        if (permissions.canManageTournament) {
          actions.push({
            action: "reopen-registration",
            label: t("reopenRegistrations"),
            icon: <Clock className="w-4 h-4" />,
            variant: "outline",
            description: t("reopenRegistrationsHelp"),
            requiresConfirmation: false,
          });
        }
        break;

      case "in_progress":
        if (permissions.canManageTournament) {
          const currentRound = tournament.currentRound || 1;
          const totalRounds = tournament.totalRounds || 1;
          const currentRoundMatches =
            tournament.matches?.filter((m) => m.round === currentRound) || [];
          const allCurrentRoundFinished =
            currentRoundMatches.length > 0 &&
            currentRoundMatches.every(
              (m) => m.status === "finished" || m.status === "forfeit",
            );

          if (allCurrentRoundFinished && currentRound < totalRounds) {
            actions.push({
              action: "advance-round",
              label: `Passer à la ronde ${currentRound + 1}`,
              icon: <SkipForward className="w-4 h-4" />,
              variant: "default",
              description: `Générer les matchs de la ronde ${currentRound + 1}/${totalRounds}`,
              requiresConfirmation: true,
            });
          }
        }
        break;
    }

    if (
      tournament.status !== "finished" &&
      tournament.status !== "cancelled" &&
      permissions.canCancelTournament
    ) {
      actions.push({
        action: "cancel-tournament",
        label: t("cancel"),
        icon: <X className="w-4 h-4" />,
        variant: "destructive",
        description: t("cancelHelp"),
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
    isStarting || isCancelling || isAdvancing || isUpdatingStatus;

  if (!permissions.canViewAdmin) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("status")}</span>
            <Badge className={statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1">
                {tournamentStatusTranslation[
                  tournament.status as keyof typeof tournamentStatusTranslation
                ] ?? tournament.status}
              </span>
            </Badge>
          </div>

          {!hasSupportedEngine &&
            tournament.status === "registration_closed" && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                {t("externalNotice")}
              </div>
            )}

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
                {t("noActions")}
              </p>
            )}
          </div>

          {tournament.status === "in_progress" && (
            <div className="pt-4 border-t">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>{t("currentRound")}</span>
                  <span className="font-medium">
                    {tournament.currentRound}/{tournament.totalRounds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("matchesLabel")}</span>
                  <span className="font-medium">
                    {tournament.matches?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("playersLabel")}</span>
                  <span className="font-medium">
                    {tournament.players?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <p>{t("startConfirm")}</p>

                  <div className="space-y-2">
                    <Label htmlFor="seeding-method">{t("seedingMethod")}</Label>
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
                        <SelectItem value="random">
                          {t("seedRandom")}
                        </SelectItem>
                        <SelectItem value="ranking">
                          {t("seedRanking")}
                        </SelectItem>
                        <SelectItem value="elo">{t("seedElo")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {confirmAction === "advance-round" && (
                <p>{t("nextRoundConfirm")}</p>
              )}

              {confirmAction === "finish-tournament" && (
                <p>{t("finishConfirm")}</p>
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
                      placeholder={t("cancelReasonPlaceholder")}
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
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
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
