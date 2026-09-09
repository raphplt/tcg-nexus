import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "../../translation/supported-locales";

/** How much a diagnostic should weigh in the reader's attention. */
export enum DiagnosticSeverity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

/** Which part of the analysis raised a diagnostic. */
export enum DiagnosticCategory {
  Legality = "legality",
  Energy = "energy",
  Consistency = "consistency",
  Evolution = "evolution",
  Focus = "focus",
  Coverage = "coverage",
}

/** Stable machine code for every rule the engine can raise. */
export enum DiagnosticCode {
  DeckSizeUnder = "DECK_SIZE_UNDER",
  DeckSizeOver = "DECK_SIZE_OVER",
  CopyLimitExceeded = "COPY_LIMIT_EXCEEDED",
  LegalityInvalid = "LEGALITY_INVALID",
  LegalityUnverified = "LEGALITY_UNVERIFIED",
  EnergyTooLow = "ENERGY_TOO_LOW",
  EnergyTooHigh = "ENERGY_TOO_HIGH",
  EnergyMissing = "ENERGY_MISSING",
  HighCostNoAcceleration = "HIGH_COST_NO_ACCELERATION",
  DrawEngineWeak = "DRAW_ENGINE_WEAK",
  SearchEngineWeak = "SEARCH_ENGINE_WEAK",
  NoRecovery = "NO_RECOVERY",
  NoSwitch = "NO_SWITCH",
  EvolutionOrphan = "EVOLUTION_ORPHAN",
  EvolutionUnderSupported = "EVOLUTION_UNDER_SUPPORTED",
  TypeSpread = "TYPE_SPREAD",
  SingleTypeFocus = "SINGLE_TYPE_FOCUS",
  EffectsCoverageLow = "EFFECTS_COVERAGE_LOW",
}

/** A rule outcome: a machine code plus the numbers that triggered it. */
export interface DeckDiagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  params: Record<string, string | number>;
  /** Card identifiers the diagnostic points at, when it points at any. */
  cardIds?: string[];
}

type MessageBuilder = (params: Record<string, string | number>) => string;

const MESSAGES: Record<
  DiagnosticCode,
  Record<SupportedLocale, MessageBuilder>
> = {
  [DiagnosticCode.DeckSizeUnder]: {
    fr: (p) => `Deck incomplet : ${p.total}/60 cartes.`,
    en: (p) => `Incomplete deck: ${p.total}/60 cards.`,
  },
  [DiagnosticCode.DeckSizeOver]: {
    fr: (p) => `Deck trop grand : ${p.total}/60 cartes.`,
    en: (p) => `Deck too large: ${p.total}/60 cards.`,
  },
  [DiagnosticCode.CopyLimitExceeded]: {
    fr: (p) =>
      `${p.cardName} est joué en ${p.qty} exemplaires (maximum 4 hors énergies de base).`,
    en: (p) =>
      `${p.cardName} is played in ${p.qty} copies (maximum 4 outside basic energy).`,
  },
  [DiagnosticCode.LegalityInvalid]: {
    fr: (p) =>
      `Deck non légal en ${p.format} : ${p.count} règle(s) enfreinte(s), voir le détail de légalité.`,
    en: (p) =>
      `Deck is not legal in ${p.format}: ${p.count} rule(s) broken, see the legality detail.`,
  },
  [DiagnosticCode.LegalityUnverified]: {
    fr: (p) =>
      `Légalité non vérifiable en ${p.format} : ${p.count} règle(s) n'ont pas pu être contrôlées. L'analyse ne conclut donc pas que le deck est légal.`,
    en: (p) =>
      `Legality could not be verified in ${p.format}: ${p.count} rule(s) could not be checked. The analysis therefore does not claim the deck is legal.`,
  },
  [DiagnosticCode.EnergyTooLow]: {
    fr: (p) =>
      `Seulement ${p.percentage}% d'énergies : vos attaques risquent de rester hors de portée (cible 25-35%).`,
    en: (p) =>
      `Only ${p.percentage}% energy: your attacks are likely to stay out of reach (target 25-35%).`,
  },
  [DiagnosticCode.EnergyTooHigh]: {
    fr: (p) =>
      `${p.percentage}% d'énergies : risque de mains mortes (cible 25-35%).`,
    en: (p) => `${p.percentage}% energy: expect dead hands (target 25-35%).`,
  },
  [DiagnosticCode.EnergyMissing]: {
    fr: () => "Aucune énergie alors que le deck contient des Pokémon.",
    en: () => "No energy at all while the deck contains Pokémon.",
  },
  [DiagnosticCode.HighCostNoAcceleration]: {
    fr: (p) =>
      `Coût d'attaque moyen de ${p.averageCost} sans accélération d'énergie détectée.`,
    en: (p) =>
      `Average attack cost of ${p.averageCost} with no energy acceleration detected.`,
  },
  [DiagnosticCode.DrawEngineWeak]: {
    fr: (p) =>
      `${p.count} carte(s) de pioche seulement : la main s'assèche vite (cible 6+).`,
    en: (p) =>
      `Only ${p.count} draw card(s): the hand dries up quickly (target 6+).`,
  },
  [DiagnosticCode.SearchEngineWeak]: {
    fr: (p) =>
      `${p.count} carte(s) de recherche : difficile de trouver la bonne pièce (cible 4+).`,
    en: (p) =>
      `${p.count} search card(s): finding the right piece will be hard (target 4+).`,
  },
  [DiagnosticCode.NoRecovery]: {
    fr: () =>
      "Aucune carte de récupération : ce qui part à la défausse y reste.",
    en: () => "No recovery card: whatever hits the discard pile stays there.",
  },
  [DiagnosticCode.NoSwitch]: {
    fr: () =>
      "Aucune carte de repli : un Pokémon lourd bloqué à l'actif coûte des tours.",
    en: () =>
      "No switching card: a heavy Pokémon stuck in the active spot costs turns.",
  },
  [DiagnosticCode.EvolutionOrphan]: {
    fr: (p) =>
      `${p.evolution} évolue de ${p.base}, absent du deck : ces ${p.evolutionQty} carte(s) sont injouables.`,
    en: (p) =>
      `${p.evolution} evolves from ${p.base}, which is missing: those ${p.evolutionQty} card(s) are unplayable.`,
  },
  [DiagnosticCode.EvolutionUnderSupported]: {
    fr: (p) =>
      `${p.evolutionQty} ${p.evolution} pour ${p.baseQty} ${p.base} : la ligne d'évolution est trop étroite.`,
    en: (p) =>
      `${p.evolutionQty} ${p.evolution} for ${p.baseQty} ${p.base}: the evolution line is too narrow.`,
  },
  [DiagnosticCode.TypeSpread]: {
    fr: (p) =>
      `${p.count} types différents (${p.types}) : concentrez-vous sur 1 ou 2 pour gagner en constance.`,
    en: (p) =>
      `${p.count} different types (${p.types}): focus on 1 or 2 for more consistency.`,
  },
  [DiagnosticCode.SingleTypeFocus]: {
    fr: (p) =>
      `Deck mono-${p.type} : ajoutez les supports qui ciblent spécifiquement ce type.`,
    en: (p) =>
      `Mono-${p.type} deck: add the support cards that specifically reward this type.`,
  },
  [DiagnosticCode.EffectsCoverageLow]: {
    fr: (p) =>
      `Effets connus pour ${p.percentage}% des cartes : les indicateurs de consistance sont partiels.`,
    en: (p) =>
      `Effects known for ${p.percentage}% of cards: consistency indicators are partial.`,
  },
};

/**
 * Renders a diagnostic in the requested locale.
 *
 * @param diagnostic Machine-readable diagnostic.
 * @param locale Locale to render in; falls back to the default locale.
 * @returns Human-readable sentence.
 */
export function renderDiagnostic(
  diagnostic: DeckDiagnostic,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  const builders = MESSAGES[diagnostic.code];
  const build = builders?.[locale] ?? builders?.[DEFAULT_LOCALE];
  return build ? build(diagnostic.params) : diagnostic.code;
}
