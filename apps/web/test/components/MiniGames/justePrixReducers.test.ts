import { describe, expect, it } from "vitest";
import {
  closestPlayer,
  initialLocalState,
  localReducer,
} from "@/components/MiniGames/JustePrix/LocalMode";
import {
  initialSoloState,
  soloReducer,
} from "@/components/MiniGames/JustePrix/SoloMode";
import type { JustePrixItem } from "@/types/mini-game";

const item = (price: number, id = "c1"): JustePrixItem => ({
  type: "card",
  id,
  price,
  data: { id, name: `Card ${id}`, set: { id: "s", name: "Set" } } as never,
});

describe("solo Juste Prix reducer", () => {
  it("hints higher / lower until the guess lands within tolerance", () => {
    let state = soloReducer(initialSoloState, {
      type: "guess",
      value: 10,
      item: item(50),
    });
    expect(state.attempts).toEqual([{ guess: 10, direction: "higher" }]);
    expect(state.status).toBe("playing");

    state = soloReducer(state, { type: "guess", value: 90, item: item(50) });
    expect(state.attempts[1]).toEqual({ guess: 90, direction: "lower" });

    state = soloReducer(state, { type: "guess", value: 47, item: item(50) });
    expect(state.status).toBe("success");
    expect(state.score).toBe(70);
    expect(state.recap).toEqual([
      { item: item(50), attempts: 3, found: true, points: 70 },
    ]);
  });

  it("fails the round after five attempts and scores nothing", () => {
    let state = initialSoloState;
    for (let i = 0; i < 5; i += 1) {
      state = soloReducer(state, { type: "guess", value: 1, item: item(50) });
    }
    expect(state.status).toBe("fail");
    expect(state.score).toBe(0);
    expect(state.recap[0]).toMatchObject({ found: false, points: 0 });

    // A sixth guess is ignored.
    expect(
      soloReducer(state, { type: "guess", value: 50, item: item(50) }),
    ).toBe(state);
  });

  it("moves to the next round, then finishes after the last one", () => {
    let state = soloReducer(initialSoloState, {
      type: "guess",
      value: 50,
      item: item(50),
    });
    state = soloReducer(state, { type: "next", totalRounds: 2 });
    expect(state).toMatchObject({ round: 2, status: "playing", attempts: [] });

    state = soloReducer(state, { type: "guess", value: 5, item: item(5, "c2") });
    state = soloReducer(state, { type: "next", totalRounds: 2 });
    expect(state.status).toBe("finished");
    expect(state.score).toBe(200);
  });

  it("ignores 'next' while the round is still open", () => {
    expect(soloReducer(initialSoloState, { type: "next", totalRounds: 3 })).toBe(
      initialSoloState,
    );
  });
});

describe("local Juste Prix reducer", () => {
  it("awards the round to the closest guess", () => {
    expect(closestPlayer(50, 40, 45)).toBe("p2");
    expect(closestPlayer(50, 55, 45)).toBeNull();

    let state = localReducer(initialLocalState, {
      type: "guess",
      value: 40,
      price: 50,
    });
    expect(state.turn).toBe("p2");
    state = localReducer(state, { type: "guess", value: 48, price: 50 });
    expect(state.turn).toBe("reveal");
    expect(state.scores).toEqual({ p1: 0, p2: 1 });
    expect(state.guesses).toEqual({ p1: 40, p2: 48 });
  });

  it("leaves the scores untouched on a tie", () => {
    let state = localReducer(initialLocalState, { type: "guess", value: 55, price: 50 });
    state = localReducer(state, { type: "guess", value: 45, price: 50 });
    expect(state.scores).toEqual({ p1: 0, p2: 0 });
  });

  it("advances rounds and finishes after the last one", () => {
    let state = localReducer(initialLocalState, { type: "guess", value: 1, price: 50 });
    state = localReducer(state, { type: "guess", value: 2, price: 50 });
    state = localReducer(state, { type: "next", totalRounds: 2 });
    expect(state).toMatchObject({
      round: 2,
      turn: "p1",
      guesses: { p1: null, p2: null },
    });

    state = localReducer(state, { type: "guess", value: 1, price: 50 });
    state = localReducer(state, { type: "guess", value: 2, price: 50 });
    state = localReducer(state, { type: "next", totalRounds: 2 });
    expect(state.turn).toBe("finished");
    expect(state.scores).toEqual({ p1: 0, p2: 2 });
  });
});
