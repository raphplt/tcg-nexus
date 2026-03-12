export type OnlineMatchSessionStatus =
  | "WAITING_FOR_DECKS"
  | "ACTIVE"
  | "FINISHED";

export type MatchParticipantSlot = "playerA" | "playerB";

export interface DeckEligibilityReason {
  code:
    | "NOT_OWNER"
    | "INVALID_SIZE"
    | "UNSUPPORTED_CARD"
    | "MISSING_CARD_DATA"
    | "MISSING_BASIC_POKEMON"
    | "NON_MAINBOARD_CARD";
  message: string;
  cardId?: string;
  tcgDexId?: string;
  cardName?: string;
}

export interface EligibleDeckSummary {
  deckId: number;
  deckName: string;
  eligible: boolean;
  reasons: DeckEligibilityReason[];
  totalCards: number;
}

export interface DeckEligibilityResult {
  matchId: number;
  sessionStatus: OnlineMatchSessionStatus;
  slot: MatchParticipantSlot | null;
  selectedDeckId: number | null;
  opponentDeckReady: boolean;
  eligibleDecks: EligibleDeckSummary[];
}

export interface SanitizedPromptOption {
  value: string;
  label: string;
  description?: string;
}

export interface PendingPromptView {
  id: string;
  type: string;
  playerId: string;
  title: string;
  minSelections: number;
  maxSelections: number;
  allowPass: boolean;
  options: SanitizedPromptOption[];
  metadata?: Record<string, unknown>;
}

export interface OnlineMatchLogEntry {
  id: string;
  kind: "ACTION" | "EVENT";
  actorPlayerId?: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface SanitizedPokemonCardView {
  instanceId: string;
  name: string;
  hp: number;
  damageCounters: number;
  types: string[];
  stage: string;
  suffix?: string;
  specialConditions: string[];
  attachedEnergyCount: number;
  attachedEnergies: Array<{
    instanceId: string;
    name: string;
    provides: string[];
    isSpecial: boolean;
  }>;
  attacks: Array<{
    name: string;
    cost: string[];
    damage?: number | string;
    effect?: string;
  }>;
  retreat?: number;
}

export interface SanitizedHandCardView {
  instanceId: string;
  name: string;
  category: string;
  stage?: string;
  image?: string;
  trainerType?: string;
  energyType?: string;
}

export interface SanitizedPlayerView {
  playerId: string;
  name: string;
  deckCount: number;
  handCount: number;
  prizesRemaining: number;
  prizeCardsTaken: number;
  active: SanitizedPokemonCardView | null;
  bench: SanitizedPokemonCardView[];
  discard: SanitizedHandCardView[];
  hand?: SanitizedHandCardView[];
}

export interface SanitizedGameState {
  id: string;
  gamePhase: string;
  turnStep: string;
  activePlayerId: string;
  firstPlayerId: string | null;
  turnNumber: number;
  winnerId: string | null;
  winnerReason: string | null;
  players: Record<string, SanitizedPlayerView>;
  pendingPrompt: PendingPromptView | null;
  awaitingPlayerId: string | null;
}

export interface OnlineMatchSessionView {
  matchId: number;
  sessionId: number | null;
  status: OnlineMatchSessionStatus;
  slot: MatchParticipantSlot | null;
  enginePlayerId: string | null;
  selectedDeckId: number | null;
  opponentDeckReady: boolean;
  gameState: SanitizedGameState | null;
  recentLog: OnlineMatchLogEntry[];
}
