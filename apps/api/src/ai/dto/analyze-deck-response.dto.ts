import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Breakdown of card counts and percentage by Pokémon type.
 */
export class DeckTypeDistributionItem {
  @ApiProperty({
    description: "Card type name (e.g. Fire, Water, Lightning)",
    example: "Lightning",
  })
  type: string;

  @ApiProperty({
    description: "Total count of cards matching this type",
    example: 12,
  })
  count: number;

  @ApiProperty({
    description: "Percentage of the total deck size (0-100)",
    example: 20,
  })
  percentage: number;
}

/**
 * Breakdown of card counts and percentage by high-level category.
 */
export class DeckCategoryDistributionItem {
  @ApiProperty({
    description: "Card category (Pokémon, Trainer, Energy)",
    example: "Pokemon",
  })
  category: string;

  @ApiProperty({
    description: "Total count of cards in this category",
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: "Percentage of the total deck size (0-100)",
    example: 33,
  })
  percentage: number;
}

/**
 * Breakdown of Pokémon attack energy costs.
 */
export class DeckEnergyCostDistributionItem {
  @ApiProperty({ description: "Energy cost value", example: 2 })
  cost: number;

  @ApiProperty({ description: "Total attacks matching this cost", example: 8 })
  count: number;

  @ApiProperty({
    description: "Percentage of total attacks (0-100)",
    example: 25,
  })
  percentage: number;
}

/**
 * Detected duplicate cards in the deck.
 */
export class DeckDuplicateItem {
  @ApiProperty({ description: "Card unique identifier", example: "base1-4" })
  cardId: string;

  @ApiProperty({ description: "Card display name", example: "Charizard" })
  cardName: string;

  @ApiProperty({
    description: "Number of copies included in the deck",
    example: 2,
  })
  count: number;
}

/**
 * Synergy cluster identified within the analyzed deck.
 */
export class DeckSynergyItem {
  @ApiProperty({
    description: "Synergy archetype classification",
    enum: ["energy-type", "evolution", "trainer-support"],
    example: "energy-type",
  })
  type: "energy-type" | "evolution" | "trainer-support";

  @ApiProperty({
    description: "Human-readable description of the detected synergy",
    example: "6 cards of Fire type detected",
  })
  description: string;

  @ApiProperty({
    description: "List of card IDs participating in this synergy",
    type: [String],
    example: ["base1-4", "base1-24"],
  })
  cardIds: string[];
}

/**
 * Deck composition and synergy evaluation response.
 */
export class DeckAnalysisResponseDto {
  @ApiPropertyOptional({
    description: "Analyzed deck identifier if analyzed from a persisted deck",
    example: 1,
  })
  deckId?: number;

  @ApiProperty({
    description: "Total number of cards included in the analysis",
    example: 60,
  })
  totalCards: number;

  @ApiProperty({
    description: "Distribution of cards by Pokémon energy/elemental type",
    type: [DeckTypeDistributionItem],
  })
  typeDistribution: DeckTypeDistributionItem[];

  @ApiProperty({
    description: "Distribution of cards across categories",
    type: [DeckCategoryDistributionItem],
  })
  categoryDistribution: DeckCategoryDistributionItem[];

  @ApiProperty({
    description: "Distribution of attack energy costs across Pokémon",
    type: [DeckEnergyCostDistributionItem],
  })
  energyCostDistribution: DeckEnergyCostDistributionItem[];

  @ApiProperty({
    description: "List of duplicated cards and their quantities",
    type: [DeckDuplicateItem],
  })
  duplicates: DeckDuplicateItem[];

  @ApiProperty({
    description: "Identified card synergies and chain combos",
    type: [DeckSynergyItem],
  })
  synergies: DeckSynergyItem[];

  @ApiProperty({
    description: "List of rule violations or balance warnings",
    type: [String],
    example: ["Deck incomplet: 58/60 cartes"],
  })
  warnings: string[];

  @ApiProperty({
    description: "Actionable deck-building recommendations",
    type: [String],
    example: ["Considérez ajouter plus de cartes énergie (recommandé: 30-40%)"],
  })
  recommendations: string[];
}
