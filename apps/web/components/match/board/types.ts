/** Player action emitted by the board, before the server resolves the slot. */
export interface MatchBoardActionInput {
  type: string;
  payload?: Record<string, unknown>;
}

/** Answer sent back for the prompt currently assigned to the player. */
export interface MatchPromptResponseInput {
  promptId: string;
  selections?: string[];
  numericChoice?: number;
}
