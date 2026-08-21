"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { collectionService } from "@/services/collection.service";
import type { Collection } from "@/types/collection";
import { getCollectionTitle } from "@/utils/collection";

interface DeleteCollectionButtonProps {
  collection: Collection;
  onDeleted: (collectionId: string) => void;
}

/**
 * Deletes an owned collection after an explicit irreversible-action prompt.
 *
 * @param props Collection to delete and callback used to update the parent list.
 * @returns A delete control and its confirmation dialog.
 */
export function DeleteCollectionButton({
  collection,
  onDeleted,
}: DeleteCollectionButtonProps) {
  const t = useTranslations("Collections.delete");
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const collectionTitle = getCollectionTitle(collection);

  const deleteCollection = async () => {
    setIsDeleting(true);

    try {
      await collectionService.deleteCollection(collection.id);
      onDeleted(collection.id);
      setOpen(false);
      toast.success(t("success", { name: collectionTitle }));
    } catch {
      toast.error(t("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute left-3 top-3 z-10 h-8 w-8 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
        aria-label={t("actionLabel", { name: collectionTitle })}
        title={t("action")}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isDeleting) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmTitle", { name: collectionTitle })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteCollection();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("action")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
