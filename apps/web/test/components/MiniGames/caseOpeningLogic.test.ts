import { describe, expect, it } from "vitest";
import { queueParamsFrom } from "@/components/MiniGames/CaseOpening/CaseOpeningGame";
import { DEFAULT_DUEL_OPTIONS } from "@/components/MiniGames/CaseOpening/DuelSetup";
import {
  duelReducer,
  initialDuelState,
} from "@/components/MiniGames/CaseOpening/duelReducer";
import { type BoosterCard, RarityTier } from "@/types/mini-game";
import { bestPull, isHit, packValue } from "@/utils/miniGames/booster";

const card = (id: string, trend: number, tier = RarityTier.Common): BoosterCard =>
  ({
    id,
    name: id,
    rarityTier: tier,
    set: { id: "s", name: "Set" },
    pricing: { cardmarket: { trend } },
  }) as never;

describe("booster helpers", () => {
  it("values a pack from market prices and spots hits", () => {
    const pack = [card("a", 1.5), card("b", 0.2), card("c", 12, RarityTier.Ultra)];
    expect(packValue(pack)).toBe(13.7);
    expect(isHit(pack[2]!)).toBe(true);
    expect(isHit(pack[0]!)).toBe(false);
    expect(bestPull(pack)?.id).toBe("c");
    expect(bestPull([])).toBeNull();
  });
});

describe("offline duel reducer", () => {
  const p1Pack = [card("a", 1), card("b", 2)];
  const p2Pack = [card("c", 0.5), card("d", 0.5)];

  it("alternates players and sums pack values", () => {
    let state = initialDuelState(2);
    state = duelReducer(state, { type: "open", cards: p1Pack });
    expect(state.stage).toBe("opening");
    expect(state.opening?.side).toBe("p1");

    state = duelReducer(state, { type: "opened" });
    expect(state).toMatchObject({ stage: "idle", active: "p2", round: 1 });
    expect(state.scores).toEqual({ p1: 3, p2: 0 });
    expect(state.packs.p1).toEqual([p1Pack]);

    state = duelReducer(state, { type: "open", cards: p2Pack });
    state = duelReducer(state, { type: "opened" });
    expect(state).toMatchObject({ stage: "idle", active: "p1", round: 2 });
    expect(state.scores).toEqual({ p1: 3, p2: 1 });
  });

  it("finishes after player 2's last booster", () => {
    let state = initialDuelState(1);
    state = duelReducer(state, { type: "open", cards: p1Pack });
    state = duelReducer(state, { type: "opened" });
    state = duelReducer(state, { type: "open", cards: p2Pack });
    state = duelReducer(state, { type: "opened" });
    expect(state.stage).toBe("finished");
    expect(state.round).toBe(1);
  });

  it("ignores actions out of turn", () => {
    const idle = initialDuelState(1);
    expect(duelReducer(idle, { type: "opened" })).toBe(idle);
    const opening = duelReducer(idle, { type: "open", cards: p1Pack });
    expect(duelReducer(opening, { type: "open", cards: p2Pack })).toBe(opening);
  });
});

describe("queueParamsFrom", () => {
  it("sends no scope for the whole catalog", () => {
    expect(queueParamsFrom(DEFAULT_DUEL_OPTIONS)).toEqual({
      roundCount: 3,
      packStyle: "standard",
      setId: undefined,
      serieId: undefined,
    });
  });

  it("sends the series, or the set which then wins over the series", () => {
    expect(
      queueParamsFrom({ ...DEFAULT_DUEL_OPTIONS, scope: "serie", serieId: "sv" }),
    ).toMatchObject({ serieId: "sv", setId: undefined });
    expect(
      queueParamsFrom({
        ...DEFAULT_DUEL_OPTIONS,
        scope: "set",
        serieId: "sv",
        setId: "sv01",
        style: "chase",
        roundCount: 5,
      }),
    ).toEqual({ roundCount: 5, packStyle: "chase", setId: "sv01", serieId: undefined });
  });

  it("falls back to the series while no set is picked yet", () => {
    expect(
      queueParamsFrom({ ...DEFAULT_DUEL_OPTIONS, scope: "set", serieId: "sv", setId: "" }),
    ).toMatchObject({ serieId: "sv", setId: undefined });
  });
});
