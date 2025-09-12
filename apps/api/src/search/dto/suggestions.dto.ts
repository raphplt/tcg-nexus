export interface SuggestionPreviewItem {
  id: string | number;
  type: 'card' | 'tournament' | 'player' | 'marketplace';
  title: string;
  subtitle?: string;
  image?: string;
}

export interface SuggestionDetailItem {
  id: string | number;
  type: 'card' | 'tournament' | 'player' | 'marketplace';
  title: string;
  description: string;
  url: string;
  image?: string;
  metadata?: Record<string, any>;
}

export interface SuggestionsPreviewResult {
  suggestions: SuggestionPreviewItem[];
  total: number;
  query: string;
}

export interface SuggestionsDetailResult {
  suggestions: SuggestionDetailItem[];
  total: number;
  query: string;
}
