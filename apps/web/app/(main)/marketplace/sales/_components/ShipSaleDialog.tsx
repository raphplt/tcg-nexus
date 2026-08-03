"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerSale } from "@/types/order";

/** Transporteurs courants pour l'envoi de cartes en France. */
const CARRIERS = [
  "La Poste",
  "Colissimo",
  "Mondial Relay",
  "Chronopost",
  "UPS",
  "DHL",
];

interface Props {
  sale: SellerSale | null;
  onClose: () => void;
  onConfirm: (carrier: string, trackingNumber: string) => Promise<void>;
}

export default function ShipSaleDialog({ sale, onClose, onConfirm }: Props) {
  const [carrier, setCarrier] = useState<string>(CARRIERS[0] ?? "La Poste");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (trackingNumber.trim().length < 3) {
      setError("Le numéro de suivi est obligatoire pour marquer l'expédition.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(carrier, trackingNumber.trim());
      setTrackingNumber("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marquer comme expédiée</DialogTitle>
          <DialogDescription>
            {sale?.productName} — commande #{sale?.order?.id}. L&apos;acheteur
            sera notifié et verra le numéro de suivi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="carrier">Transporteur</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger id="carrier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking">Numéro de suivi</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="6A12345678901"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer l&apos;expédition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
