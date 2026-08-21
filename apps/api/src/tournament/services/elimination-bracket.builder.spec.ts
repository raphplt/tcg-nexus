import { BracketSide, MatchStatus } from "../../match/entities/match.entity";
import {
  buildDoubleEliminationPlan,
  buildSingleEliminationPlan,
  EliminationPlan,
  PlanNode,
  PlanPlayer,
} from "./elimination-bracket.builder";

const field = (count: number): PlanPlayer[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `P${index + 1}`,
    seed: index + 1,
  }));

const nodeByKey = (plan: EliminationPlan) =>
  new Map(plan.nodes.map((node) => [node.key, node]));

/**
 * Replays a whole tournament, the best seed always winning, and reports who
 * took the title and how many defeats each player collected.
 */
function playThrough(plan: EliminationPlan): {
  champion?: PlanPlayer;
  defeats: Map<number, number>;
} {
  const byKey = nodeByKey(plan);
  const defeats = new Map<number, number>();
  let champion: PlanPlayer | undefined;

  const seat = (node: PlanNode | undefined, slot: "A" | "B", p: PlanPlayer) => {
    if (!node) return;
    if (slot === "A") node.playerA = p;
    else node.playerB = p;
  };

  const ordered = [...plan.nodes].sort(
    (a, b) => a.round - b.round || a.key - b.key,
  );

  for (const node of ordered) {
    const players = [node.playerA, node.playerB].filter((p): p is PlanPlayer =>
      Boolean(p),
    );

    if (players.length === 0) continue;

    let winner = players[0];

    if (players.length === 2) {
      winner =
        (players[0].seed ?? 0) <= (players[1].seed ?? 0)
          ? players[0]
          : players[1];
      const loser = players.find((p) => p.id !== winner.id)!;

      defeats.set(loser.id, (defeats.get(loser.id) ?? 0) + 1);

      if (node.loserTarget) {
        seat(byKey.get(node.loserTarget.key), node.loserTarget.slot, loser);
      }
    }

    node.winner = winner;
    if (node.winnerTarget) {
      seat(byKey.get(node.winnerTarget.key), node.winnerTarget.slot, winner);
    } else {
      champion = winner;
    }
  }

  return { champion, defeats };
}

describe("elimination bracket builder", () => {
  describe("single elimination", () => {
    it("creates the whole tree upfront", () => {
      const plan = buildSingleEliminationPlan(field(8));

      expect(plan.totalRounds).toBe(3);
      expect(plan.nodes).toHaveLength(7);
      expect(
        plan.nodes.every((node) => node.side === BracketSide.WINNERS),
      ).toBe(true);
      expect(plan.nodes.filter((node) => !node.winnerTarget)).toHaveLength(1);
    });

    it("never sends a loser anywhere", () => {
      const plan = buildSingleEliminationPlan(field(8));

      expect(plan.nodes.every((node) => !node.loserTarget)).toBe(true);
    });

    it("crowns the top seed and knocks every other player out once", () => {
      const plan = buildSingleEliminationPlan(field(8));
      const { champion, defeats } = playThrough(plan);

      expect(champion?.id).toBe(1);
      expect([...defeats.values()].every((count) => count === 1)).toBe(true);
      expect(defeats.size).toBe(7);
    });
  });

  describe("double elimination structure", () => {
    it.each([
      [4, 6, 4],
      [8, 14, 6],
      [16, 30, 8],
    ])("lays out %i players over %i matches and %i steps", (players, matches, rounds) => {
      const plan = buildDoubleEliminationPlan(field(players));

      expect(plan.nodes).toHaveLength(matches);
      expect(plan.totalRounds).toBe(rounds);
    });

    it("splits the matches between the two branches and the grand final", () => {
      const plan = buildDoubleEliminationPlan(field(8));
      const count = (side: BracketSide) =>
        plan.nodes.filter((node) => node.side === side).length;

      expect(count(BracketSide.WINNERS)).toBe(7);
      expect(count(BracketSide.LOSERS)).toBe(6);
      expect(count(BracketSide.GRAND_FINAL)).toBe(1);
    });

    it("points every link at an existing match", () => {
      const plan = buildDoubleEliminationPlan(field(16));
      const keys = new Set(plan.nodes.map((node) => node.key));

      for (const node of plan.nodes) {
        if (node.winnerTarget)
          expect(keys.has(node.winnerTarget.key)).toBe(true);
        if (node.loserTarget) expect(keys.has(node.loserTarget.key)).toBe(true);
      }
    });

    it("always links forward, so the bracket has no cycle", () => {
      const plan = buildDoubleEliminationPlan(field(16));
      const byKey = nodeByKey(plan);

      for (const node of plan.nodes) {
        for (const link of [node.winnerTarget, node.loserTarget]) {
          if (!link) continue;
          expect(byKey.get(link.key)!.round).toBeGreaterThan(node.round);
        }
      }
    });

    it("fills each slot from exactly one source", () => {
      const plan = buildDoubleEliminationPlan(field(16));
      const feeders = new Map<string, number>();

      for (const node of plan.nodes) {
        for (const link of [node.winnerTarget, node.loserTarget]) {
          if (!link) continue;
          const slot = `${link.key}-${link.slot}`;
          feeders.set(slot, (feeders.get(slot) ?? 0) + 1);
        }
      }

      expect([...feeders.values()].every((count) => count === 1)).toBe(true);
    });

    it("leaves only the grand final without a successor", () => {
      const plan = buildDoubleEliminationPlan(field(8));
      const terminals = plan.nodes.filter((node) => !node.winnerTarget);

      expect(terminals).toHaveLength(1);
      expect(terminals[0].side).toBe(BracketSide.GRAND_FINAL);
    });

    it("runs both branches of a step under the same round number", () => {
      const plan = buildDoubleEliminationPlan(field(8));
      const step2 = plan.nodes.filter((node) => node.round === 2);

      expect(
        step2.filter((node) => node.side === BracketSide.WINNERS),
      ).toHaveLength(2);
      expect(
        step2.filter((node) => node.side === BracketSide.LOSERS),
      ).toHaveLength(2);
    });

    it("handles a two-player field by sending the loser to the grand final", () => {
      const plan = buildDoubleEliminationPlan(field(2));

      expect(plan.nodes).toHaveLength(2);
      const opener = plan.nodes.find(
        (node) => node.side === BracketSide.WINNERS,
      )!;
      const grandFinal = plan.nodes.find(
        (node) => node.side === BracketSide.GRAND_FINAL,
      )!;
      expect(opener.winnerTarget).toEqual({ key: grandFinal.key, slot: "A" });
      expect(opener.loserTarget).toEqual({ key: grandFinal.key, slot: "B" });
    });
  });

  describe("double elimination byes", () => {
    it.each([
      6, 7, 11,
    ])("resolves the opening byes of a %i-player field", (playerCount) => {
      const plan = buildDoubleEliminationPlan(field(playerCount));
      const openers = plan.nodes.filter(
        (node) => node.side === BracketSide.WINNERS && node.round === 1,
      );
      const bracketSize = 2 ** Math.ceil(Math.log2(playerCount));

      expect(openers).toHaveLength(bracketSize / 2);
      const resolvedByes = openers.filter(
        (node) => node.status === MatchStatus.FINISHED,
      );
      expect(resolvedByes).toHaveLength(bracketSize - playerCount);
      for (const bye of resolvedByes) {
        expect(bye.winner).toBeDefined();
        // A bye produces no loser, so nothing drops from it.
        expect(bye.loserTarget).toBeUndefined();
      }
    });

    it("drops the losers bracket slots nobody can ever reach", () => {
      const plan = buildDoubleEliminationPlan(field(5));

      // Three first round byes leave one losers bracket opener unreachable.
      expect(plan.nodes).toHaveLength(13);
      expect(
        plan.nodes.filter(
          (node) => node.side === BracketSide.LOSERS && node.round === 2,
        ),
      ).toHaveLength(1);
    });

    it.each([
      5, 6, 7, 11, 13,
    ])("knocks every %i-player field out on the second defeat", (playerCount) => {
      const plan = buildDoubleEliminationPlan(field(playerCount));
      const { champion, defeats } = playThrough(plan);

      expect(champion).toBeDefined();
      expect(defeats.get(champion!.id) ?? 0).toBeLessThanOrEqual(1);

      const eliminated = [...defeats.entries()].filter(
        ([id]) => id !== champion!.id,
      );
      expect(eliminated).toHaveLength(playerCount - 1);
      for (const [, count] of eliminated) {
        expect(count).toBe(2);
      }
    });

    it("crowns the top seed when the favourite always wins", () => {
      const plan = buildDoubleEliminationPlan(field(8));
      const { champion, defeats } = playThrough(plan);

      expect(champion?.id).toBe(1);
      expect(defeats.get(1)).toBeUndefined();
    });
  });

  describe("rematch avoidance", () => {
    it.each([
      8, 16, 32,
    ])("never replays the previous round when dropping into a %i-slot losers bracket", (bracketSize) => {
      const plan = buildDoubleEliminationPlan(field(bracketSize));
      const byKey = nodeByKey(plan);

      /** Losers bracket matches a dropped player can climb through. */
      const climbFrom = (start: PlanNode): Set<number> => {
        const reachable = new Set<number>();
        let current: PlanNode | undefined = start;
        while (current) {
          reachable.add(current.key);
          current = current.winnerTarget
            ? byKey.get(current.winnerTarget.key)
            : undefined;
        }
        return reachable;
      };

      for (const node of plan.nodes) {
        if (node.side !== BracketSide.WINNERS || !node.loserTarget) continue;

        const target = byKey.get(node.loserTarget.key)!;
        const targetRoundSize = plan.nodes.filter(
          (candidate) =>
            candidate.side === target.side && candidate.round === target.round,
        ).length;

        // The last losers round holds a single match: whoever survived it
        // faces the beaten finalist, rematch or not.
        if (targetRoundSize < 2) continue;

        const feeders = plan.nodes.filter(
          (candidate) => candidate.winnerTarget?.key === node.key,
        );

        for (const feeder of feeders) {
          if (!feeder.loserTarget) continue;
          const dropped = byKey.get(feeder.loserTarget.key)!;

          // The player this match's loser knocked out one round earlier must
          // not be able to climb back into the very slot facing them.
          expect(climbFrom(dropped).has(target.key)).toBe(false);
        }
      }
    });
  });
});
