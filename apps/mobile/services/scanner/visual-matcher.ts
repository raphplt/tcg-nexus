import type { VisualMatchResult } from "@/types/scanner";

export const visualMatcher = {
  /**
   * Phase 1 — Stub.
   * Retourne method="none" et un tableau vide.
   * This interface can be replaced by a pHash and server-index implementation.
   */
  async match(_cardBase64: string): Promise<VisualMatchResult> {
    return {
      method: "none",
      topMatches: [],
      durationMs: 0,
    };
  },
};
