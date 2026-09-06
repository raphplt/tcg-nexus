"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { sellerReviewService } from "@/services/seller-review.service";
import type { OrderItem } from "@/types/order";

interface SellerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  item: OrderItem | null;
  onReviewSuccess?: () => void;
}

export function SellerReviewModal({
  isOpen,
  onClose,
  orderId,
  item,
  onReviewSuccess,
}: SellerReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await sellerReviewService.createReview(orderId, item.id, {
        rating,
        comment: comment.trim() || undefined,
      });

      if (onReviewSuccess) {
        onReviewSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer votre avis.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer votre achat</DialogTitle>
          <DialogDescription>
            Votre avis certifié aide la communauté à identifier les vendeurs de confiance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="p-3 bg-muted rounded-md space-y-1">
            <p className="text-xs text-muted-foreground">Article évalué</p>
            <p className="text-sm font-semibold truncate">{item.productName}</p>
            <p className="text-xs text-muted-foreground">Vendu par {item.sellerName}</p>
          </div>

          <div className="space-y-2 text-center">
            <Label>Note globale</Label>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Commentaire (facultatif)</Label>
            <Textarea
              id="review-comment"
              placeholder="État conforme, emballage soigné, expédition rapide..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Publier mon avis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
