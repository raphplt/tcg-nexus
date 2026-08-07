"use client";

import { useState } from "react";
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

interface ResetMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
}

export function ResetMatchDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ResetMatchDialogProps) {
  const [reason, setReason] = useState("");

  const trimmedReason = reason.trim();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setReason("");
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser ce match ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le score et le résultat seront effacés. Cette action peut modifier
            la progression du tournoi et doit rester exceptionnelle.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reset-match-reason">
            Motif de la réinitialisation
          </Label>
          <Textarea
            id="reset-match-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex. erreur de saisie du score"
            maxLength={300}
          />
          <p className="text-right text-xs text-muted-foreground">
            {reason.length}/300
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Conserver</AlertDialogCancel>
          <AlertDialogAction
            disabled={!trimmedReason || isPending}
            onClick={(event) => {
              if (!trimmedReason) {
                event.preventDefault();
                return;
              }
              onConfirm(trimmedReason);
            }}
          >
            {isPending ? "Réinitialisation..." : "Réinitialiser"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
