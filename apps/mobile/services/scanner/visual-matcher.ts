// ─── Module 4 : VisualMatcher ─────────────────────────────────────────────────
// Phase 1 MVP : stub — retourne toujours un résultat vide.
// Phase 2 : implémentera pHash mobile + comparaison contre index serveur.

import type { VisualMatchResult } from "@/types/scanner";

export const visualMatcher = {
  /**
   * Phase 1 — Stub.
   * Retourne method="none" et un tableau vide.
   * L'interface est définie pour être remplacée en Phase 2
   * par une vraie implémentation pHash + index serveur.
   */
  async match(_cardBase64: string): Promise<VisualMatchResult> {
    return {
      method: "none",
      topMatches: [],
      durationMs: 0,
    };
  },
};
