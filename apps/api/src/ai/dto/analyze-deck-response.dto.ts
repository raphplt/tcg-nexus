export class DeckAnalysisResponseDto {
  deckId?: number;
  totalCards: number;
  typeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
    percentage: number;
  }[];
  energyCostDistribution: {
    cost: number;
    count: number;
    percentage: number;
  }[];
  duplicates: {
    cardId: string;
    cardName: string;
    count: number;
  }[];
  synergies: {
    type: 'energy-type' | 'evolution' | 'trainer-support';
    description: string;
    cardIds: string[];
  }[];
  warnings: string[];
  recommendations: string[];
}
