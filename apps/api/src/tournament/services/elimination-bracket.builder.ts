import {
  BracketSide,
  MatchPhase,
  MatchStatus,
} from "../../match/entities/match.entity";

/**
 * Player as carried by a bracket plan: just enough to fill a slot.
 */
export interface PlanPlayer {
  id: number;
  name: string;
  seed?: number;
}

export type PlanSlot = "A" | "B";

/** Destination of a winner or a loser, expressed with plan keys. */
export interface PlanLink {
  key: number;
  slot: PlanSlot;
}

/**
 * One match of the bracket, before it is persisted.
 *
 * `key` is a local identifier: links point to keys, and the persistence layer
 * swaps them for the real match ids once every row exists.
 */
export interface PlanNode {
  key: number;
  /** Global step of the tournament, shared by the parallel branches. */
  round: number;
  side: BracketSide;
  position: number;
  phase: MatchPhase;
  playerA?: PlanPlayer;
  playerB?: PlanPlayer;
  winner?: PlanPlayer;
  winnerTarget?: PlanLink;
  loserTarget?: PlanLink;
  isBye: boolean;
  status: MatchStatus;
}

export interface EliminationPlan {
  totalRounds: number;
  nodes: PlanNode[];
}

/**
 * Working copy of a node during the bye resolution pass.
 *
 * A slot is `void` when no player can ever reach it: either the feeding match
 * is impossible, or it is a bye, which produces no loser.
 */
interface DraftNode extends PlanNode {
  voidA: boolean;
  voidB: boolean;
  pruned: boolean;
}

/**
 * Standard seeding order for a bracket of the given size.
 *
 * Produces 1-8-4-5-2-7-3-6 for eight slots: the top seed always faces the
 * weakest remaining opponent.
 */
export function generateSeedOrder(bracketSize: number): number[] {
  let order = [1, 2];

  while (order.length < bracketSize) {
    const seedSum = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, seedSum - seed]);
  }

  return order;
}

/**
 * Number of winners rounds — and so the depth of the bracket — for a field.
 */
function roundCount(playerCount: number): number {
  return Math.max(1, Math.ceil(Math.log2(playerCount)));
}

/**
 * Builds a single elimination bracket: one tree, losers are out immediately.
 *
 * @param players - Seeded players, best seed first.
 * @returns Every match of the tournament, byes already resolved.
 */
export function buildSingleEliminationPlan(
  players: PlanPlayer[],
): EliminationPlan {
  const totalRounds = roundCount(players.length);
  const bracketSize = 2 ** totalRounds;

  const draft = new DraftBuilder();
  const winners = draft.addWinnersRounds(
    totalRounds,
    bracketSize,
    players,
    (round) => singleEliminationPhase(round, totalRounds),
  );

  for (let round = 1; round < totalRounds; round++) {
    winners[round - 1].forEach((node, position) => {
      node.winnerTarget = {
        key: winners[round][Math.floor(position / 2)].key,
        slot: position % 2 === 0 ? "A" : "B",
      };
    });
  }

  return draft.finalize(totalRounds);
}

/**
 * Builds a double elimination bracket: winners tree, losers tree, grand final.
 *
 * Rounds are numbered as global steps — winners round 2 and losers round 1
 * are both step 2 — so that "every match of the current step is over" stays
 * the signal to move on.
 *
 * @param players - Seeded players, best seed first.
 * @returns The `2 * bracketSize - 2` matches of the bracket, byes resolved.
 */
export function buildDoubleEliminationPlan(
  players: PlanPlayer[],
): EliminationPlan {
  const winnersRounds = roundCount(players.length);
  const bracketSize = 2 ** winnersRounds;
  const losersRounds = 2 * (winnersRounds - 1);
  const totalRounds = 2 * winnersRounds;

  const draft = new DraftBuilder();

  const winners = draft.addWinnersRounds(
    winnersRounds,
    bracketSize,
    players,
    (round) => winnersPhase(round, winnersRounds),
    winnersStep,
  );

  const losers: DraftNode[][] = [];
  for (let round = 1; round <= losersRounds; round++) {
    const matchCount = losersRoundSize(bracketSize, round);
    losers.push(
      draft.addRound({
        round: round + 1,
        side: BracketSide.LOSERS,
        matchCount,
        phase: losersPhase(round, losersRounds),
      }),
    );
  }

  const grandFinal = draft.addRound({
    round: totalRounds,
    side: BracketSide.GRAND_FINAL,
    matchCount: 1,
    phase: MatchPhase.FINAL,
  })[0];

  // Winners bracket progression, up to the grand final.
  for (let round = 1; round < winnersRounds; round++) {
    winners[round - 1].forEach((node, position) => {
      node.winnerTarget = {
        key: winners[round][Math.floor(position / 2)].key,
        slot: position % 2 === 0 ? "A" : "B",
      };
    });
  }
  winners[winnersRounds - 1][0].winnerTarget = {
    key: grandFinal.key,
    slot: "A",
  };

  // Losers bracket progression: a minor round feeds the next major round one
  // to one, a major round halves into the next minor round.
  for (let round = 1; round < losersRounds; round++) {
    const isMinor = round % 2 === 1;
    losers[round - 1].forEach((node, position) => {
      node.winnerTarget = isMinor
        ? { key: losers[round][position].key, slot: "A" }
        : {
            key: losers[round][Math.floor(position / 2)].key,
            slot: position % 2 === 0 ? "A" : "B",
          };
    });
  }
  if (losersRounds > 0) {
    losers[losersRounds - 1][0].winnerTarget = {
      key: grandFinal.key,
      slot: "B",
    };
  }

  // Drops from the winners bracket into the losers bracket.
  if (losersRounds === 0) {
    // Two-player field: the only defeat leads straight to the grand final.
    winners[0][0].loserTarget = { key: grandFinal.key, slot: "B" };
  } else {
    winners[0].forEach((node, position) => {
      node.loserTarget = {
        key: losers[0][Math.floor(position / 2)].key,
        slot: position % 2 === 0 ? "A" : "B",
      };
    });

    for (let round = 2; round <= winnersRounds; round++) {
      const targetRound = losers[2 * round - 3];
      const matchCount = winners[round - 1].length;

      winners[round - 1].forEach((node, position) => {
        node.loserTarget = {
          key: targetRound[dropPosition(round, position, matchCount)].key,
          slot: "B",
        };
      });
    }
  }

  return draft.finalize(totalRounds);
}

/**
 * Global step a winners round is played at.
 *
 * From round 2 onwards a winners round shares its step with the losers round
 * that consumes the previous drops.
 */
function winnersStep(round: number): number {
  return round === 1 ? 1 : 2 * round - 2;
}

/** Match count of a losers round; minor and major rounds come in equal pairs. */
function losersRoundSize(bracketSize: number, round: number): number {
  return bracketSize / 2 ** (Math.ceil(round / 2) + 1);
}

/**
 * Position a winners-round loser drops to, avoiding an immediate rematch.
 *
 * Without crossing, the loser of a winners match would land against the very
 * player they knocked out in the previous round. Reversing the order on even
 * rounds — and keeping it natural on odd ones — separates the two branches.
 */
function dropPosition(
  winnersRound: number,
  position: number,
  matchCount: number,
): number {
  return winnersRound % 2 === 0 ? matchCount - 1 - position : position;
}

function singleEliminationPhase(
  round: number,
  totalRounds: number,
): MatchPhase {
  if (round === totalRounds) return MatchPhase.FINAL;
  if (round === totalRounds - 1) return MatchPhase.SEMI_FINAL;
  if (round === totalRounds - 2) return MatchPhase.QUARTER_FINAL;
  return MatchPhase.QUALIFICATION;
}

function winnersPhase(round: number, winnersRounds: number): MatchPhase {
  if (round === winnersRounds) return MatchPhase.SEMI_FINAL;
  if (round === winnersRounds - 1) return MatchPhase.QUARTER_FINAL;
  return MatchPhase.QUALIFICATION;
}

function losersPhase(round: number, losersRounds: number): MatchPhase {
  if (round === losersRounds) return MatchPhase.SEMI_FINAL;
  if (round === losersRounds - 1) return MatchPhase.QUARTER_FINAL;
  return MatchPhase.QUALIFICATION;
}

/**
 * Accumulates the draft nodes and resolves byes before handing back a plan.
 */
class DraftBuilder {
  private readonly nodes: DraftNode[] = [];
  private nextKey = 1;

  addRound(options: {
    round: number;
    side: BracketSide;
    matchCount: number;
    phase: MatchPhase;
  }): DraftNode[] {
    const round: DraftNode[] = [];

    for (let position = 0; position < options.matchCount; position++) {
      const node: DraftNode = {
        key: this.nextKey++,
        round: options.round,
        side: options.side,
        position,
        phase: options.phase,
        isBye: false,
        status: MatchStatus.SCHEDULED,
        voidA: false,
        voidB: false,
        pruned: false,
      };
      this.nodes.push(node);
      round.push(node);
    }

    return round;
  }

  /**
   * Creates the winners tree and seats the seeded players in its first round.
   */
  addWinnersRounds(
    totalRounds: number,
    bracketSize: number,
    players: PlanPlayer[],
    phaseFor: (round: number) => MatchPhase,
    stepFor: (round: number) => number = (round) => round,
  ): DraftNode[][] {
    const rounds: DraftNode[][] = [];

    for (let round = 1; round <= totalRounds; round++) {
      rounds.push(
        this.addRound({
          round: stepFor(round),
          side: BracketSide.WINNERS,
          matchCount: bracketSize / 2 ** round,
          phase: phaseFor(round),
        }),
      );
    }

    const slots = generateSeedOrder(bracketSize).map(
      (seed) => players[seed - 1],
    );

    rounds[0].forEach((node, position) => {
      node.playerA = slots[position * 2];
      node.playerB = slots[position * 2 + 1];
      node.voidA = !node.playerA;
      node.voidB = !node.playerB;
    });

    return rounds;
  }

  /**
   * Resolves byes, drops the matches nobody can ever reach, and returns the
   * plan sorted by step.
   */
  finalize(totalRounds: number): EliminationPlan {
    const byKey = new Map(this.nodes.map((node) => [node.key, node]));
    const ordered = [...this.nodes].sort(
      (a, b) => a.round - b.round || a.key - b.key,
    );

    const voidSlot = (link?: PlanLink) => {
      if (!link) return;
      const target = byKey.get(link.key);
      if (!target) return;
      if (link.slot === "A") target.voidA = true;
      else target.voidB = true;
    };

    const fillSlot = (link: PlanLink | undefined, player: PlanPlayer) => {
      if (!link) return;
      const target = byKey.get(link.key);
      if (!target) return;
      if (link.slot === "A") target.playerA = player;
      else target.playerB = player;
    };

    for (const node of ordered) {
      // No branch can feed this slot any more: the match will never happen.
      if (node.voidA && node.voidB) {
        node.pruned = true;
        voidSlot(node.winnerTarget);
        voidSlot(node.loserTarget);
        continue;
      }

      const seated = node.playerA ?? node.playerB;
      const halfVoid = node.voidA || node.voidB;

      if (halfVoid && seated) {
        // The opponent slot is dead and the player is already known.
        node.isBye = true;
        node.status = MatchStatus.FINISHED;
        node.winner = seated;
        fillSlot(node.winnerTarget, seated);
        voidSlot(node.loserTarget);
        node.loserTarget = undefined;
        continue;
      }

      if (halfVoid) {
        // Whoever arrives here clears the round unopposed.
        node.isBye = true;
        voidSlot(node.loserTarget);
        node.loserTarget = undefined;
      }
    }

    const kept = ordered.filter((node) => !node.pruned);
    const keptKeys = new Set(kept.map((node) => node.key));
    const dropDeadLink = (link?: PlanLink) =>
      link && keptKeys.has(link.key) ? link : undefined;

    const nodes: PlanNode[] = kept.map((node) => ({
      key: node.key,
      round: node.round,
      side: node.side,
      position: node.position,
      phase: node.phase,
      playerA: node.playerA,
      playerB: node.playerB,
      winner: node.winner,
      winnerTarget: dropDeadLink(node.winnerTarget),
      loserTarget: dropDeadLink(node.loserTarget),
      isBye: node.isBye,
      status: node.status,
    }));

    return { totalRounds, nodes };
  }
}
