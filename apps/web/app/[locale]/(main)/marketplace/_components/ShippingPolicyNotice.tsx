"use client";

import { Truck } from "lucide-react";
import { useShippingPolicy } from "@/hooks/useMarketplace";
import { formatPrice } from "@/utils/price";

interface ShippingPolicyNoticeProps {
  productKind?: "card" | "sealed";
}

/**
 * Les frais de port et le délai d'expédition sont imposés par la plateforme :
 * on les affiche au vendeur au lieu de les lui faire saisir.
 */
export function ShippingPolicyNotice({
  productKind = "card",
}: ShippingPolicyNoticeProps) {
  const { data } = useShippingPolicy();
  const rate = data?.rates.find((r) => r.productKind === productKind);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
      <Truck className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <div className="space-y-0.5">
        <p className="font-medium">Expédition prise en charge par TCG Nexus</p>
        <p className="text-muted-foreground">
          {rate
            ? `${rate.label} : ${formatPrice(rate.cost, "EUR")} facturés à l'acheteur`
            : "Tarif d'expédition appliqué automatiquement"}
          {data
            ? ` - vous disposez de ${data.handlingTimeDays} jours ouvrés pour expédier.`
            : ""}
        </p>
      </div>
    </div>
  );
}
