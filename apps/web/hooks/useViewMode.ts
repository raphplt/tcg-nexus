"use client";

import { useState, useEffect } from "react";
import type { ViewMode } from "@/components/Marketplace/ViewToggle";

const STORAGE_KEY = "marketplace-view-mode";

export function useViewMode(
  defaultMode: ViewMode = "grid",
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "grid" || stored === "list") {
        setViewMode(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setAndPersist = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable
    }
  };

  return [viewMode, setAndPersist];
}
