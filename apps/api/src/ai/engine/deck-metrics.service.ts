import { Injectable } from "@nestjs/common";
import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import type { Card } from "../../card/entities/card.entity";
import { PokemonCardsType } from "../../common/enums/pokemonCardsType";
import { DeckLegalityStatus } from "../../tournament/entities/tournament-deck-snapshot.entity";
import { DeckLegalityService } from "../../tournament/services/deck-legality.service";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "../../translation/supported-locales";
import type {
  DeckInsightsDto,
  MissingCardSuggestionDto,
} from "../dto/deck-insights.dto";
import {
  DeckCardRoleTag,
  detectCardRoles,
  expectsEffects,
  hasReadableEffects,
} from "./card-roles";
import {
  type DeckDiagnostic,
  DiagnosticCategory,
  DiagnosticCode,
  DiagnosticSeverity,
  renderDiagnostic,
} from "./deck-diagnostics";
import {
  type DeckScoreBoard,
  type LegalityOutcome,
  scoreDeck,
} from "./deck-scoring";
import { buildEvolutionLines, type EvolutionLine } from "./evolution-lines";

/**
 * Engine revision. Bump it whenever a rule, threshold or weight changes so
 * stored or client-cached analyses can be told apart.
 */
export const DECK_ENGINE_VERSION = "2";

/** Official list size. */
const REQUIRED_DECK_SIZE = 60;
/** Copies of a single card allowed outside basic energy. */
const MAX_COPIES_PER_CARD = 4;

/** Rule set to check a deck format against. */
const RULE_VERSION_BY_FORMAT: Record<string, string> = {
  standard: "POKEMON_STANDARD_2026",
  extended: "POKEMON_EXPANDED_2026",
  expanded: "POKEMON_EXPANDED_2026",
};

/** A deck entry the engine can analyze. */
export interface AnalyzableDeckCard {
  card: Card;
  qty: number;
}

/** Everything the engine needs beyond the card list itself. */
export interface DeckAnalysisContext {
  deckId?: number;
  formatId?: number | null;
  formatType?: string | null;
  locale?: SupportedLocale;
}

/**
 * Computes every deterministic signal the product exposes about a deck.
 *
 * This is the single implementation behind `POST /deck/:id/analyze` and the
 * ad-hoc `POST /ai/decks/analyze`: no external service is called, so the
 * analysis is identical online and offline.
 */
@Injectable()
export class DeckMetricsService {
  constructor(
    private readonly localization: CatalogLocalizationService,
    private readonly legality: DeckLegalityService,
  ) {}

  /**
   * Analyzes a deck list and returns its full insight payload.
   *
   * @param cards Deck entries with their quantities.
   * @param context Deck identity, format, and the locale to render messages in.
   * @returns Metrics, scores, and diagnostics for the list.
   */
  async analyze(
    cards: AnalyzableDeckCard[],
    context: DeckAnalysisContext = {},
  ): Promise<DeckInsightsDto> {
    const locale = context.locale ?? DEFAULT_LOCALE;

    // Names, `evolveFrom` and categories live in `card_translation`: resolve
    // them before anything compares or groups by label.
    await this.localization.resolveLabels(cards);

    const entries = cards.filter((entry) => !!entry.card);
    const totalCards = entries.reduce(
      (sum, entry) => sum + (entry.qty || 0),
      0,
    );

    const typeMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const attackCostMap = new Map<number, number>();
    const roleMap = new Map<
      DeckCardRoleTag,
      { count: number; ids: string[] }
    >();

    let totalAttackCost = 0;
    let totalAttackCount = 0;
    let totalRetreat = 0;
    let retreatSamples = 0;
    let effectsExpected = 0;
    let effectsRead = 0;

    for (const entry of entries) {
      const { card } = entry;
      const qty = entry.qty || 0;
      const details = card.pokemonDetails;

      details?.types?.forEach((type) =>
        typeMap.set(type, (typeMap.get(type) || 0) + qty),
      );

      const category = this.normalizeCategory(details?.category);
      categoryMap.set(category, (categoryMap.get(category) || 0) + qty);

      details?.attacks?.forEach((attack) => {
        const cost = attack.cost?.length || 0;
        attackCostMap.set(cost, (attackCostMap.get(cost) || 0) + qty);
        totalAttackCost += cost * qty;
        totalAttackCount += qty;
      });

      if (
        category === PokemonCardsType.Pokemon &&
        typeof details?.retreat === "number"
      ) {
        totalRetreat += details.retreat * qty;
        retreatSamples += qty;
      }

      const roleSource = {
        id: card.id,
        category,
        parsedEffects: details?.parsedEffects ?? null,
      };

      if (expectsEffects(roleSource)) {
        effectsExpected += qty;
        if (hasReadableEffects(roleSource)) effectsRead += qty;
      }

      for (const detected of detectCardRoles(roleSource)) {
        const bucket = roleMap.get(detected.role) ?? { count: 0, ids: [] };
        bucket.count += qty;
        bucket.ids.push(card.id);
        roleMap.set(detected.role, bucket);
      }
    }

    const typeDistribution = this.toDistribution(typeMap, totalCards);
    const categoryDistribution = this.toDistribution(categoryMap, totalCards);
    const attackCostDistribution = Array.from(attackCostMap.entries())
      .map(([cost, count]) => ({
        cost,
        count,
        percentage: totalAttackCount
          ? Math.round((count / totalAttackCount) * 100)
          : 0,
      }))
      .sort((a, b) => a.cost - b.cost);

    const pokemonCount = categoryMap.get(PokemonCardsType.Pokemon) || 0;
    const energyCount = categoryMap.get(PokemonCardsType.Energy) || 0;
    const trainerCount = categoryMap.get(PokemonCardsType.Trainer) || 0;

    const averageEnergyCost = totalAttackCount
      ? Number((totalAttackCost / totalAttackCount).toFixed(2))
      : 0;
    const averageRetreatCost = retreatSamples
      ? Number((totalRetreat / retreatSamples).toFixed(2))
      : 0;
    const energyToPokemonRatio = pokemonCount
      ? Number((energyCount / pokemonCount).toFixed(2))
      : 0;
    const energyPercentage = totalCards
      ? Math.round((energyCount / totalCards) * 100)
      : 0;

    const duplicates = this.findCopyLimitBreaches(entries);
    const evolutionLines = buildEvolutionLines(
      entries.map((entry) => ({
        cardId: entry.card.id,
        name: entry.card.name,
        evolveFrom: entry.card.pokemonDetails?.evolveFrom,
        qty: entry.qty || 0,
      })),
    );

    const legality = await this.checkLegality(entries, context);

    const roleCounts = Object.values(DeckCardRoleTag).reduce(
      (acc, role) => {
        acc[role] = roleMap.get(role)?.count ?? 0;
        return acc;
      },
      {} as Record<DeckCardRoleTag, number>,
    );

    const effectsCoveragePercentage = effectsExpected
      ? Math.round((effectsRead / effectsExpected) * 100)
      : 0;

    const scores = scoreDeck({
      totalCards,
      pokemonCount,
      energyCount,
      energyPercentage,
      averageEnergyCost,
      averageRetreatCost,
      roleCounts,
      typeCount: typeDistribution.length,
      evolutionLines,
      legality: legality.status,
      copyLimitBreaches: duplicates.length,
      effectsCoveragePercentage,
    });

    const diagnostics = this.buildDiagnostics({
      totalCards,
      pokemonCount,
      energyCount,
      energyPercentage,
      averageEnergyCost,
      roleCounts,
      typeDistribution,
      evolutionLines,
      duplicates,
      legality,
      effectsCoveragePercentage,
      effectsExpected,
    });

    const rendered = diagnostics.map((diagnostic) => ({
      ...diagnostic,
      message: renderDiagnostic(diagnostic, locale),
    }));

    return {
      deckId: context.deckId,
      engineVersion: DECK_ENGINE_VERSION,
      totalCards,
      pokemonCount,
      energyCount,
      trainerCount,
      energyToPokemonRatio,
      averageEnergyCost,
      averageRetreatCost,
      typeDistribution,
      categoryDistribution,
      attackCostDistribution,
      duplicates,
      roles: Array.from(roleMap.entries()).map(([role, bucket]) => ({
        role,
        count: bucket.count,
        cardIds: Array.from(new Set(bucket.ids)),
      })),
      effectsCoverage: {
        withEffects: effectsRead,
        expected: effectsExpected,
        percentage: effectsCoveragePercentage,
      },
      evolutionLines,
      legality: legality.report,
      scores,
      diagnostics: rendered,
      warnings: rendered
        .filter((entry) => entry.severity !== DiagnosticSeverity.Info)
        .map((entry) => entry.message),
      suggestions: rendered
        .filter((entry) => entry.severity === DiagnosticSeverity.Info)
        .map((entry) => entry.message),
      missingCards: this.buildMissingCards(
        { roleCounts, energyCount, energyPercentage, totalCards },
        locale,
      ),
    };
  }

  /**
   * Maps a localized category label onto the canonical enum.
   *
   * `card_translation.category` is localized ("Énergie", "Dresseur"), so
   * grouping on the raw label splits the same category across locales.
   */
  private normalizeCategory(category?: string | null): string {
    if (!category) return "Unknown";

    const normalized = category
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (normalized === "pokemon") return PokemonCardsType.Pokemon;
    if (normalized === "energy" || normalized === "energie") {
      return PokemonCardsType.Energy;
    }
    if (normalized === "trainer" || normalized === "dresseur") {
      return PokemonCardsType.Trainer;
    }
    return category;
  }

  private toDistribution(
    map: Map<string, number>,
    total: number,
  ): { label: string; count: number; percentage: number }[] {
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /** Basic energy is exempt from the four-copy limit. */
  private findCopyLimitBreaches(
    entries: AnalyzableDeckCard[],
  ): { cardId: string; cardName: string; qty: number }[] {
    return entries
      .filter((entry) => {
        if ((entry.qty || 0) <= MAX_COPIES_PER_CARD) return false;
        const details = entry.card.pokemonDetails;
        const isBasicEnergy =
          this.normalizeCategory(details?.category) ===
            PokemonCardsType.Energy && !!details?.energyType;
        return !isBasicEnergy;
      })
      .map((entry) => ({
        cardId: entry.card.id,
        cardName: entry.card.name || entry.card.id,
        qty: entry.qty,
      }));
  }

  /**
   * Checks the list against its format's rule set.
   *
   * A deck with no format, or a format this build has no rules for, comes back
   * `not-checked` rather than valid: the analysis never claims legality it did
   * not verify.
   */
  private async checkLegality(
    entries: AnalyzableDeckCard[],
    context: DeckAnalysisContext,
  ): Promise<{
    status: LegalityOutcome;
    report: DeckInsightsDto["legality"];
  }> {
    const formatType = context.formatType?.trim();
    const ruleVersion = formatType
      ? RULE_VERSION_BY_FORMAT[formatType.toLowerCase()]
      : undefined;

    if (!ruleVersion) {
      return {
        status: "not-checked",
        report: {
          status: "not-checked",
          format: formatType ?? undefined,
          errors: [],
          unknowns: [],
        },
      };
    }

    const result = await this.legality.validate(
      entries.map((entry) => ({
        cardId: entry.card.id,
        name: entry.card.name || entry.card.id,
        quantity: entry.qty || 0,
      })),
      ruleVersion,
      context.formatId ?? null,
    );

    const status: LegalityOutcome =
      result.status === DeckLegalityStatus.VALID
        ? "valid"
        : result.status === DeckLegalityStatus.INVALID
          ? "invalid"
          : "unverified";

    return {
      status,
      report: {
        status,
        ruleVersion,
        format: formatType,
        errors: result.errors,
        unknowns: result.unknowns,
      },
    };
  }

  private buildDiagnostics(input: {
    totalCards: number;
    pokemonCount: number;
    energyCount: number;
    energyPercentage: number;
    averageEnergyCost: number;
    roleCounts: Record<DeckCardRoleTag, number>;
    typeDistribution: { label: string; count: number; percentage: number }[];
    evolutionLines: EvolutionLine[];
    duplicates: { cardId: string; cardName: string; qty: number }[];
    legality: { status: LegalityOutcome; report: DeckInsightsDto["legality"] };
    effectsCoveragePercentage: number;
    effectsExpected: number;
  }): DeckDiagnostic[] {
    const diagnostics: DeckDiagnostic[] = [];
    const push = (
      code: DiagnosticCode,
      severity: DiagnosticSeverity,
      category: DiagnosticCategory,
      params: Record<string, string | number>,
      cardIds?: string[],
    ) => diagnostics.push({ code, severity, category, params, cardIds });

    if (input.totalCards < REQUIRED_DECK_SIZE) {
      push(
        DiagnosticCode.DeckSizeUnder,
        DiagnosticSeverity.Error,
        DiagnosticCategory.Legality,
        { total: input.totalCards },
      );
    } else if (input.totalCards > REQUIRED_DECK_SIZE) {
      push(
        DiagnosticCode.DeckSizeOver,
        DiagnosticSeverity.Error,
        DiagnosticCategory.Legality,
        { total: input.totalCards },
      );
    }

    for (const duplicate of input.duplicates) {
      push(
        DiagnosticCode.CopyLimitExceeded,
        DiagnosticSeverity.Error,
        DiagnosticCategory.Legality,
        { cardName: duplicate.cardName, qty: duplicate.qty },
        [duplicate.cardId],
      );
    }

    if (input.legality.status === "invalid") {
      push(
        DiagnosticCode.LegalityInvalid,
        DiagnosticSeverity.Error,
        DiagnosticCategory.Legality,
        {
          format: input.legality.report.format ?? "",
          count: input.legality.report.errors.length,
        },
      );
    } else if (input.legality.status === "unverified") {
      push(
        DiagnosticCode.LegalityUnverified,
        DiagnosticSeverity.Warning,
        DiagnosticCategory.Legality,
        {
          format: input.legality.report.format ?? "",
          count: input.legality.report.unknowns.length,
        },
      );
    }

    if (input.pokemonCount > 0 && input.energyCount === 0) {
      push(
        DiagnosticCode.EnergyMissing,
        DiagnosticSeverity.Error,
        DiagnosticCategory.Energy,
        {},
      );
    } else if (input.totalCards > 0 && input.energyPercentage < 25) {
      push(
        DiagnosticCode.EnergyTooLow,
        DiagnosticSeverity.Warning,
        DiagnosticCategory.Energy,
        { percentage: input.energyPercentage },
      );
    } else if (input.energyPercentage > 35) {
      push(
        DiagnosticCode.EnergyTooHigh,
        DiagnosticSeverity.Warning,
        DiagnosticCategory.Energy,
        { percentage: input.energyPercentage },
      );
    }

    if (
      input.averageEnergyCost > 2.5 &&
      (input.roleCounts[DeckCardRoleTag.EnergyAcceleration] ?? 0) === 0
    ) {
      push(
        DiagnosticCode.HighCostNoAcceleration,
        DiagnosticSeverity.Warning,
        DiagnosticCategory.Energy,
        { averageCost: input.averageEnergyCost },
      );
    }

    // Consistency rests on parsed effects: when almost none could be read, the
    // engine reports the gap instead of asserting the deck lacks draw.
    const effectsReadable = input.effectsCoveragePercentage >= 50;

    if (effectsReadable) {
      const draw = input.roleCounts[DeckCardRoleTag.Draw] ?? 0;
      if (draw < 6) {
        push(
          DiagnosticCode.DrawEngineWeak,
          DiagnosticSeverity.Warning,
          DiagnosticCategory.Consistency,
          { count: draw },
        );
      }

      const search = input.roleCounts[DeckCardRoleTag.Search] ?? 0;
      if (search < 4) {
        push(
          DiagnosticCode.SearchEngineWeak,
          DiagnosticSeverity.Info,
          DiagnosticCategory.Consistency,
          { count: search },
        );
      }

      if ((input.roleCounts[DeckCardRoleTag.Recovery] ?? 0) === 0) {
        push(
          DiagnosticCode.NoRecovery,
          DiagnosticSeverity.Info,
          DiagnosticCategory.Consistency,
          {},
        );
      }

      if ((input.roleCounts[DeckCardRoleTag.Switch] ?? 0) === 0) {
        push(
          DiagnosticCode.NoSwitch,
          DiagnosticSeverity.Info,
          DiagnosticCategory.Consistency,
          {},
        );
      }
    }

    if (input.effectsExpected > 0 && input.effectsCoveragePercentage < 80) {
      push(
        DiagnosticCode.EffectsCoverageLow,
        DiagnosticSeverity.Info,
        DiagnosticCategory.Coverage,
        { percentage: input.effectsCoveragePercentage },
      );
    }

    for (const line of input.evolutionLines) {
      if (line.issue === "orphan") {
        push(
          DiagnosticCode.EvolutionOrphan,
          DiagnosticSeverity.Warning,
          DiagnosticCategory.Evolution,
          {
            evolution: line.evolution,
            base: line.base,
            evolutionQty: line.evolutionQty,
          },
          line.cardIds,
        );
      } else if (line.issue === "under-supported") {
        push(
          DiagnosticCode.EvolutionUnderSupported,
          DiagnosticSeverity.Warning,
          DiagnosticCategory.Evolution,
          {
            evolution: line.evolution,
            base: line.base,
            evolutionQty: line.evolutionQty,
            baseQty: line.baseQty,
          },
          line.cardIds,
        );
      }
    }

    if (input.typeDistribution.length > 2) {
      push(
        DiagnosticCode.TypeSpread,
        DiagnosticSeverity.Info,
        DiagnosticCategory.Focus,
        {
          count: input.typeDistribution.length,
          types: input.typeDistribution
            .slice(0, 3)
            .map((entry) => entry.label)
            .join(", "),
        },
      );
    } else if (input.typeDistribution.length === 1 && input.energyCount > 0) {
      push(
        DiagnosticCode.SingleTypeFocus,
        DiagnosticSeverity.Info,
        DiagnosticCategory.Focus,
        { type: input.typeDistribution[0].label },
      );
    }

    return diagnostics;
  }

  /**
   * Turns the engine's gaps into concrete "add N of this" advice.
   *
   * Quantities are derived from the same thresholds the scorer uses, so the
   * advice and the score never contradict each other.
   */
  private buildMissingCards(
    input: {
      roleCounts: Record<DeckCardRoleTag, number>;
      energyCount: number;
      energyPercentage: number;
      totalCards: number;
    },
    locale: SupportedLocale,
  ): MissingCardSuggestionDto[] {
    const fr = locale === "fr";
    const suggestions: MissingCardSuggestionDto[] = [];

    const draw = input.roleCounts[DeckCardRoleTag.Draw] ?? 0;
    if (draw < 6) {
      suggestions.push({
        label: fr ? "Cartes de pioche" : "Draw cards",
        reason: fr
          ? "Le deck ne rejoue pas assez de cartes par tour pour trouver ses pièces."
          : "The deck does not refill its hand fast enough to find its pieces.",
        recommendedQty: 6 - draw,
      });
    }

    const search = input.roleCounts[DeckCardRoleTag.Search] ?? 0;
    if (search < 4) {
      suggestions.push({
        label: fr ? "Cartes de recherche" : "Search cards",
        reason: fr
          ? "Sans recherche, la mise en place dépend entièrement de la chance."
          : "Without search, the setup depends entirely on luck.",
        recommendedQty: 4 - search,
      });
    }

    if (input.totalCards > 0 && input.energyPercentage < 25) {
      const target = Math.ceil(input.totalCards * 0.25);
      suggestions.push({
        label: fr ? "Énergies" : "Energy",
        reason: fr
          ? "La proportion d'énergies est sous la fourchette de 25-35%."
          : "The energy share sits below the 25-35% band.",
        recommendedQty: Math.max(1, target - input.energyCount),
      });
    }

    if ((input.roleCounts[DeckCardRoleTag.Switch] ?? 0) === 0) {
      suggestions.push({
        label: fr ? "Cartes de repli" : "Switching cards",
        reason: fr
          ? "Aucun moyen de sortir un Pokémon bloqué à l'actif."
          : "No way to move a stranded Pokémon out of the active spot.",
        recommendedQty: 2,
      });
    }

    return suggestions;
  }
}
