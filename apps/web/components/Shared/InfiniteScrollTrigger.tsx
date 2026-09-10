"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

interface InfiniteScrollTriggerProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** How far before the end of the list the next page starts loading. */
  rootMargin?: string;
}

/**
 * Placed after a list: loads the next page as it scrolls into view, with a button fallback when observing is not possible.
 */
export function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  rootMargin = "400px",
}: InfiniteScrollTriggerProps) {
  const t = useTranslations("Common");
  const triggerRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Re-observing after each page means a still-visible trigger keeps loading until the viewport is filled.
  useEffect(() => {
    const node = triggerRef.current;
    if (
      !node ||
      !hasNextPage ||
      isFetchingNextPage ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, rootMargin]);

  if (!hasNextPage) return null;

  return (
    <div ref={triggerRef} className="flex justify-center py-4">
      {isFetchingNextPage ? (
        <Loader2
          className="h-5 w-5 animate-spin text-primary"
          aria-label={t("loading")}
        />
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={onLoadMore}>
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}
