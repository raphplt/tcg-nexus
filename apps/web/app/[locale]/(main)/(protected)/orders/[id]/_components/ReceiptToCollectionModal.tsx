"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  FolderPlus,
  Loader2,
  Sparkles,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collectionService } from "@/services/collection.service";
import { paymentService } from "@/services/payment.service";
import type { Collection } from "@/types/collection";
import type { ReceiptImportPreviewItem } from "@/types/delivery-receipt";

interface ReceiptToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onImportSuccess?: () => void;
}

export function ReceiptToCollectionModal({
  isOpen,
  onClose,
  orderId,
  onImportSuccess,
}: ReceiptToCollectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ReceiptImportPreviewItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSuccessCount(null);
      setError(null);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [preview, userCollections] = await Promise.all([
          paymentService.getReceiptImportPreview(orderId),
          collectionService.getMyCollections(),
        ]);

        setItems(preview.items || []);
        setCollections(userCollections || []);

        if (
          userCollections &&
          userCollections.length > 0 &&
          userCollections[0]
        ) {
          setSelectedCollectionId(userCollections[0].id);
        }

        // Preselect all non-imported delivered items
        const nonImported = (preview.items || [])
          .filter(
            (it) => it.fulfillmentStatus === "delivered" && !it.alreadyImported,
          )
          .map((it) => it.orderItemId);
        setSelectedItemIds(new Set(nonImported));
      } catch (err: any) {
        setError(
          err.message || "Erreur lors du chargement des articles livrés.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, orderId]);

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedItemIds.size === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const payloadItems = Array.from(selectedItemIds).map((id) => {
        const found = items.find((it) => it.orderItemId === id);
        return {
          orderItemId: id,
          condition: found?.condition || undefined,
        };
      });

      const res = await paymentService.importToCollection(orderId, {
        collectionId: selectedCollectionId || undefined,
        items: payloadItems,
        allowDuplicates: false,
      });

      setSuccessCount(res.importedCount);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Échec de l'importation dans la collection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Importer vos articles reçus dans votre collection
          </DialogTitle>
          <DialogDescription>
            Ajoutez directement les cartes livrées de votre commande avec leur
            historique d&apos;achat et état vérifié.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Recherche des articles livrés...
            </p>
          </div>
        ) : successCount !== null ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
              <Check className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Importation réussie !</h3>
              <p className="text-sm text-muted-foreground">
                {successCount} article(s) ajouté(s) à votre collection avec
                provenance certifiée.
              </p>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={onClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Collection de destination</Label>
              {collections.length > 0 ? (
                <Select
                  value={selectedCollectionId}
                  onValueChange={setSelectedCollectionId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Une collection par défaut sera créée automatiquement pour
                  accueillir ces articles.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Articles éligibles</Label>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2 divide-y">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun article livré n&apos;est disponible pour
                    l&apos;importation.
                  </p>
                ) : (
                  items.map((item) => {
                    const isSelected = selectedItemIds.has(item.orderItemId);
                    const isDelivered = item.fulfillmentStatus === "delivered";

                    return (
                      <div
                        key={item.orderItemId}
                        onClick={() => {
                          if (isDelivered && !item.alreadyImported) {
                            toggleItem(item.orderItemId);
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-muted/50"
                        } ${!isDelivered || item.alreadyImported ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="relative h-12 w-10 shrink-0 bg-muted rounded overflow-hidden">
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                              TCG
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.productName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {item.condition && (
                              <Badge variant="outline">{item.condition}</Badge>
                            )}
                            {item.language && (
                              <Badge variant="outline">
                                {item.language.toUpperCase()}
                              </Badge>
                            )}
                            <span>x{item.quantity}</span>
                          </div>
                        </div>

                        <div>
                          {item.alreadyImported ? (
                            <Badge
                              variant="secondary"
                              className="text-xs flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              Déjà importé
                            </Badge>
                          ) : !isDelivered ? (
                            <Badge variant="outline" className="text-xs">
                              En attente de livraison
                            </Badge>
                          ) : (
                            <div
                              className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={submitting || selectedItemIds.size === 0}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <Sparkles className="h-4 w-4" />
                Importer ({selectedItemIds.size})
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
