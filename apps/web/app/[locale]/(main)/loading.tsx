import React from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <PageSkeleton cardsCount={8} hasFilterBar={true} />;
}
