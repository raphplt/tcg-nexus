import React from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function MarketplaceLoading() {
  return <PageSkeleton cardsCount={12} hasFilterBar={true} />;
}
