import type { BoosterCard } from "@/types/mini-game";
import { packValue } from "@/utils/miniGames/booster";

export type Side = "p1" | "p2";

export type DuelStage = "idle" | "opening" | "finished";

export interface DuelState {
  /** Current round, 1-based. */
  round: number;
  totalRounds: number;
  /** Who opens next (or is opening). */
  active: Side;
  stage: DuelStage;
  /** Pack being revealed, when `stage` is `opening`. */
  opening: { side: Side; cards: BoosterCard[] } | null;
  packs: Record<Side, BoosterCard[][]>;
  scores: Record<Side, number>;
}

export type DuelAction =
  | { type: "open"; cards: BoosterCard[] }
  | { type: "opened" };

export function initialDuelState(totalRounds: number): DuelState {
  return {
    round: 1,
    totalRounds,
    active: "p1",
    stage: "idle",
    opening: null,
    packs: { p1: [], p2: [] },
    scores: { p1: 0, p2: 0 },
  };
}

/**
 * Turn logic of an offline duel (solo or local). Player 1 opens first each
 * round, then player 2; after player 2's booster the round advances or the
 * duel ends. Pure, so the flow is testable without the roulette animation.
 */
export function duelReducer(state: DuelState, action: DuelAction): DuelState {
  switch (action.type) {
    case "open": {
      if (state.stage !== "idle") return state;
      return {
        ...state,
        stage: "opening",
        opening: { side: state.active, cards: action.cards },
      };
    }
    case "opened": {
      if (state.stage !== "opening" || !state.opening) return state;
      const { side, cards } = state.opening;
      const packs = { ...state.packs, [side]: [...state.packs[side], cards] };
      const scores = {
        ...state.scores,
        [side]: Math.round((state.scores[side] + packValue(cards)) * 100) / 100,
      };

      if (side === "p1") {
        return { ...state, stage: "idle", opening: null, active: "p2", packs, scores };
      }
      if (state.round >= state.totalRounds) {
        return { ...state, stage: "finished", opening: null, packs, scores };
      }
      return {
        ...state,
        stage: "idle",
        opening: null,
        active: "p1",
        round: state.round + 1,
        packs,
        scores,
      };
    }
    default:
      return state;
  }
}
