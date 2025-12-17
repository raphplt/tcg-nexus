export interface DistributionEntry {
  label: string;
  count: number;
  percentage: number;
}

export interface AttackCostDistribution {
  cost: number;
  count: number;
  percentage: number;
}

export interface DuplicateCardIssue {
  cardId: string;
  cardName: string;
  qty: number;
}

export interface MissingCardSuggestion {
  label: string;
  reason: string;
  recommendedQty: number;
}

export interface DeckAnalysis {
  deckId: number;
  totalCards: number;
  pokemonCount: number;
  energyCount: number;
  trainerCount: number;
  energyToPokemonRatio: number;
  averageEnergyCost: number;
  typeDistribution: DistributionEntry[];
  categoryDistribution: DistributionEntry[];
  attackCostDistribution: AttackCostDistribution[];
  duplicates: DuplicateCardIssue[];
  warnings: string[];
  suggestions: string[];
  missingCards: MissingCardSuggestion[];
}
