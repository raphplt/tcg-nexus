export type SetupTaskType =
  | "CHOOSE_FIRST_PLAYER"
  | "CHOOSE_ACTIVE"
  | "CHOOSE_BENCH"
  | "CHOOSE_MULLIGAN_DRAW"
  | "FINALIZE_SETUP";

export interface SetupTask {
  id: string;
  type: SetupTaskType;
  playerId?: string;
  metadata?: Record<string, unknown>;
}

export interface SetupState {
  coinFlipWinnerId: string;
  mulliganCounts: Record<string, number>;
  mulliganBonusDraws: Record<string, number>;
  tasks: SetupTask[];
  openingHandsReady: boolean;
}
