"use client";

import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { useShippingPolicy } from "@/hooks/useMarketplace";
import { formatPrice } from "@/utils/price";

interface ShippingPolicyNoticeProps {
  productKind?: "card" | "sealed";
}

/**
 * The platform defines shipping fees and handling time, so they are displayed instead of entered by the seller.
 */
export function ShippingPolicyNotice({
  productKind = "card",
}: ShippingPolicyNoticeProps) {
  const t = useTranslations("ShippingPolicy");
  const { data } = useShippingPolicy();
  const rate = data?.rates.find((r) => r.productKind === productKind);

  const details = [
    t("handledByNexus"),
    rate && t("buyerPays", { cost: formatPrice(rate.cost, "EUR") }),
    data && t("handlingTime", { days: data.handlingTimeDays }),
  ].filter(Boolean);

  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Truck className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{details.join(" · ")}</span>
    </p>
  );
}
