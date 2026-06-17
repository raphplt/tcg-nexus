// ─── Configuration centrale du pipeline scanner ──────────────────────────────
// Toutes les constantes critiques sont ici — modifiable sans toucher aux modules.

export const SCANNER_CONFIG = {
  // Ratio physique d'une carte Pokémon : 63mm × 88mm
  CARD_ASPECT_RATIO: 63 / 88, // ≈ 0.716

  // Tolérance sur le ratio pour la détection (±10%)
  CARD_RATIO_TOLERANCE: 0.10,

  // Dimensions normalisées après rectification perspective
  NORMALIZED_WIDTH: 420,
  NORMALIZED_HEIGHT: 588,

  // Zones de crop ciblées (en fraction de la hauteur de la carte normalisée)
  NAME_ZONE: { top: 0, bottom: 0.15 },    // Nom : 0–15%
  NUMBER_ZONE: { top: 0.82, bottom: 1.0 }, // Numéro : 82–100%

  // Seuils de confiance finale (score sur 125)
  CONFIDENCE_HIGH_THRESHOLD: 80,
  CONFIDENCE_MEDIUM_THRESHOLD: 45,

  // Score max théorique par critère
  SCORE_NAME_EXACT: 40,
  SCORE_NAME_PARTIAL: 20,
  SCORE_NUMBER_EXACT: 40,
  SCORE_NUMBER_PARTIAL: 20,
  SCORE_SET_COHERENT: 15,
  SCORE_VISUAL: 30, // Phase 2

  // Qualité JPEG pour les crops OCR
  OCR_CROP_QUALITY: 0.92,

  // Largeur de redimensionnement pour l'OCR (pixels)
  OCR_RESIZE_WIDTH: 1200,
} as const;
