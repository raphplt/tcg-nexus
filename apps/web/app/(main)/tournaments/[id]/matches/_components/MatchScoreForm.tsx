"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trophy, Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Match } from "@/types/tournament";
import { useMatches } from "@/hooks/useMatches";
import { useMatchPermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

const scoreSchema = z.object({
  playerAScore: z.number().min(0, "Le score doit être positif"),
  playerBScore: z.number().min(0, "Le score doit être positif"),
  isForfeit: z.boolean().optional(),
  notes: z.string().optional(),
});

type ScoreFormData = z.infer<typeof scoreSchema>;

interface MatchScoreFormProps {
  match: Match;
  onSuccess?: () => void;
}

export function MatchScoreForm({ match, onSuccess }: MatchScoreFormProps) {
  const { user } = useAuth();
  const permissions = useMatchPermissions(user, match);
  const { reportScore, isReporting } = useMatches(
    match.tournament.id.toString(),
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<ScoreFormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      playerAScore: match.playerAScore || 0,
      playerBScore: match.playerBScore || 0,
      isForfeit: false,
      notes: match.notes || "",
    },
  });

  const watchedValues = watch();
  const hasWinner = watchedValues.playerAScore !== watchedValues.playerBScore;
  const winner =
    watchedValues.playerAScore > watchedValues.playerBScore
      ? match.playerA
      : match.playerB;

  const onSubmit = (data: ScoreFormData) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const confirmSubmit = () => {
    if (formData) {
      reportScore(match.id, formData);
      setShowConfirmation(false);
      setFormData(null);
      onSuccess?.();
    }
  };

  const getMatchStatusBadge = () => {
    switch (match.status) {
      case "scheduled":
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Programmé
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Trophy className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        );
      case "finished":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Terminé
          </Badge>
        );
      case "forfeit":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Forfait
          </Badge>
        );
      default:
        return <Badge variant="outline">{match.status}</Badge>;
    }
  };

  if (!permissions.canReportScore) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions pour modifier ce match.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (match.status === "finished" || match.status === "forfeit") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Résultat du match
            {getMatchStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Joueur A */}
            <div
              className={`text-center p-4 rounded-lg ${
                match.winner?.id === match.playerA?.id
                  ? "bg-green-100 border-2 border-green-300"
                  : "bg-gray-50"
              }`}
            >
              <Avatar className="w-12 h-12 mx-auto mb-2">
                <AvatarFallback>{match.playerA?.name[0]}</AvatarFallback>
              </Avatar>
              <p className="font-medium">{match.playerA?.name}</p>
              <div className="text-2xl font-bold mt-2">
                {match.playerAScore}
              </div>
              {match.winner?.id === match.playerA?.id && (
                <Trophy className="w-5 h-5 mx-auto mt-1 text-yellow-500" />
              )}
            </div>

            {/* VS */}
            <div className="text-center">
              <span className="text-4xl font-bold text-muted-foreground">
                VS
              </span>
            </div>

            {/* Joueur B */}
            <div
              className={`text-center p-4 rounded-lg ${
                match.winner?.id === match.playerB?.id
                  ? "bg-green-100 border-2 border-green-300"
                  : "bg-gray-50"
              }`}
            >
              <Avatar className="w-12 h-12 mx-auto mb-2">
                <AvatarFallback>{match.playerB?.name[0]}</AvatarFallback>
              </Avatar>
              <p className="font-medium">{match.playerB?.name}</p>
              <div className="text-2xl font-bold mt-2">
                {match.playerBScore}
              </div>
              {match.winner?.id === match.playerB?.id && (
                <Trophy className="w-5 h-5 mx-auto mt-1 text-yellow-500" />
              )}
            </div>
          </div>

          {match.notes && (
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-sm">{match.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Saisir le résultat
            {getMatchStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Interface de score */}
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Joueur A */}
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarFallback className="text-lg">
                    {match.playerA?.name[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium mb-3">{match.playerA?.name}</p>
                <div className="space-y-2">
                  <Label htmlFor="playerAScore">Score</Label>
                  <Input
                    id="playerAScore"
                    type="number"
                    min="0"
                    className="text-center text-2xl font-bold h-12"
                    {...register("playerAScore", { valueAsNumber: true })}
                  />
                  {errors.playerAScore && (
                    <p className="text-sm text-destructive">
                      {errors.playerAScore.message}
                    </p>
                  )}
                </div>
              </div>

              {/* VS avec preview du vainqueur */}
              <div className="text-center">
                <span className="text-4xl font-bold text-muted-foreground mb-4 block">
                  VS
                </span>
                {hasWinner && !watchedValues.isForfeit && (
                  <div className="space-y-2">
                    <Trophy className="w-8 h-8 mx-auto text-yellow-500" />
                    <p className="text-sm font-medium text-yellow-600">
                      Vainqueur : {winner?.name}
                    </p>
                  </div>
                )}
                {watchedValues.playerAScore === watchedValues.playerBScore && (
                  <p className="text-sm font-medium text-blue-600">Égalité</p>
                )}
              </div>

              {/* Joueur B */}
              <div className="text-center">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarFallback className="text-lg">
                    {match.playerB?.name[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium mb-3">{match.playerB?.name}</p>
                <div className="space-y-2">
                  <Label htmlFor="playerBScore">Score</Label>
                  <Input
                    id="playerBScore"
                    type="number"
                    min="0"
                    className="text-center text-2xl font-bold h-12"
                    {...register("playerBScore", { valueAsNumber: true })}
                  />
                  {errors.playerBScore && (
                    <p className="text-sm text-destructive">
                      {errors.playerBScore.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Options supplémentaires */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Switch
                  id="forfeit"
                  {...register("isForfeit")}
                />
                <Label
                  htmlFor="forfeit"
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Match par forfait
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnelles)</Label>
                <Textarea
                  id="notes"
                  placeholder="Commentaires sur le match..."
                  {...register("notes")}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <AlertDialogTrigger asChild>
                <Button
                  type="submit"
                  disabled={!isValid || isReporting}
                  className="flex-1"
                >
                  {isReporting ? "Enregistrement..." : "Valider le résultat"}
                </Button>
              </AlertDialogTrigger>

              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <AlertDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le résultat</AlertDialogTitle>
            <AlertDialogDescription>
              {formData && (
                <div className="space-y-3">
                  <p>Voulez-vous enregistrer ce résultat ?</p>

                  <div className="bg-muted p-3 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{match.playerA?.name}</span>
                      <span className="text-2xl font-bold">
                        {formData.playerAScore}
                      </span>
                    </div>
                    <div className="text-center text-sm text-muted-foreground my-1">
                      VS
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{match.playerB?.name}</span>
                      <span className="text-2xl font-bold">
                        {formData.playerBScore}
                      </span>
                    </div>
                  </div>

                  {formData.isForfeit && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ Match par forfait
                    </p>
                  )}

                  {formData.notes && (
                    <div>
                      <p className="text-sm font-medium">Notes :</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmit}
              disabled={isReporting}
            >
              {isReporting ? "Enregistrement..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
