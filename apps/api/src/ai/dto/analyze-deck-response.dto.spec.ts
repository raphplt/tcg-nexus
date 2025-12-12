import { DeckAnalysisResponseDto } from './analyze-deck-response.dto';

describe('DeckAnalysisResponseDto', () => {
  it('should instantiate with default structure', () => {
    const dto = new DeckAnalysisResponseDto();
    dto.deckId = 1;
    dto.totalCards = 0;
    dto.typeDistribution = [];
    dto.categoryDistribution = [];
    dto.energyCostDistribution = [];
    dto.duplicates = [];
    dto.synergies = [];
    dto.warnings = [];
    dto.recommendations = [];

    expect(dto.deckId).toBe(1);
    expect(dto.typeDistribution).toEqual([]);
    expect(dto.recommendations).toEqual([]);
  });
});
