import {
  SwissMatchResult,
  SwissPairing,
  SwissPairingService,
} from "./swiss-pairing.service";

describe("SwissPairingService", () => {
  let service: SwissPairingService;

  beforeEach(() => {
    service = new SwissPairingService();
  });

  const players = (count: number) =>
    Array.from({ length: count }, (_, index) => index + 1);

  /** Replays a round: the player with the lowest id wins 2-0. */
  const playRound = (pairings: SwissPairing[]): SwissMatchResult[] =>
    pairings.map((pairing) =>
      pairing.isBye
        ? { playerAId: pairing.playerAId, isBye: true }
        : {
            playerAId: pairing.playerAId,
            playerBId: pairing.playerBId,
            winnerId: Math.min(pairing.playerAId, pairing.playerBId!),
            playerAScore: pairing.playerAId < pairing.playerBId! ? 2 : 0,
            playerBScore: pairing.playerAId < pairing.playerBId! ? 0 : 2,
          },
    );

  describe("recommendedRounds", () => {
    it.each([
      [2, 1],
      [4, 3],
      [8, 3],
      [9, 4],
      [16, 4],
      [17, 5],
      [128, 7],
    ])("recommends %i players -> %i rounds", (count, expected) => {
      expect(service.recommendedRounds(count)).toBe(expected);
    });
  });

  describe("computeStandings", () => {
    it("awards 3 points for a win and 1 for a draw", () => {
      const standings = service.computeStandings(players(4), [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
        {
          playerAId: 3,
          playerBId: 4,
          playerAScore: 1,
          playerBScore: 1,
        },
      ]);

      const byId = new Map(standings.map((s) => [s.playerId, s]));
      expect(byId.get(1)!.points).toBe(3);
      expect(byId.get(1)!.wins).toBe(1);
      expect(byId.get(2)!.points).toBe(0);
      expect(byId.get(2)!.losses).toBe(1);
      expect(byId.get(3)!.points).toBe(1);
      expect(byId.get(3)!.draws).toBe(1);
      expect(byId.get(4)!.points).toBe(1);
    });

    it("counts a bye as a win but keeps it out of the tie-breakers", () => {
      const standings = service.computeStandings(players(3), [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
        { playerAId: 3, isBye: true },
      ]);

      const bye = standings.find((s) => s.playerId === 3)!;
      expect(bye.points).toBe(3);
      expect(bye.wins).toBe(1);
      expect(bye.byes).toBe(1);
      expect(bye.opponentIds).toEqual([]);
      expect(bye.opponentMatchWinRate).toBe(0);
      expect(bye.gameWinRate).toBe(0);
    });

    it("floors each opponent rate at 33% when computing OMW%", () => {
      // Player 2 lost everything: their real rate is 0 but counts as 1/3.
      const standings = service.computeStandings(players(2), [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
      ]);

      const leader = standings.find((s) => s.playerId === 1)!;
      expect(leader.opponentMatchWinRate).toBeCloseTo(1 / 3, 5);
    });

    it("ranks on OMW% when players are tied on points", () => {
      // Both 1 and 3 won once, but player 1 faced the stronger opponent.
      const standings = service.computeStandings(players(6), [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
        { playerAId: 3, playerBId: 4, winnerId: 3, playerAScore: 2 },
        { playerAId: 2, playerBId: 5, winnerId: 2, playerAScore: 2 },
        { playerAId: 4, playerBId: 6, winnerId: 6, playerBScore: 2 },
      ]);

      const first = standings.findIndex((s) => s.playerId === 1);
      const third = standings.findIndex((s) => s.playerId === 3);
      expect(first).toBeLessThan(third);
    });

    it("computes the game win rate from game scores", () => {
      const standings = service.computeStandings(players(2), [
        {
          playerAId: 1,
          playerBId: 2,
          winnerId: 1,
          playerAScore: 2,
          playerBScore: 1,
        },
      ]);

      expect(standings.find((s) => s.playerId === 1)!.gameWinRate).toBeCloseTo(
        2 / 3,
        5,
      );
      expect(standings.find((s) => s.playerId === 2)!.gameWinRate).toBeCloseTo(
        1 / 3,
        5,
      );
    });
  });

  describe("pairNextRound", () => {
    it("pairs an even field without byes", () => {
      const standings = service.computeStandings(players(8), []);
      const pairings = service.pairNextRound(standings);

      expect(pairings).toHaveLength(4);
      expect(pairings.some((p) => p.isBye)).toBe(false);

      const paired = pairings.flatMap((p) => [p.playerAId, p.playerBId]);
      expect(new Set(paired).size).toBe(8);
    });

    it("gives exactly one bye on an odd field", () => {
      const standings = service.computeStandings(players(7), []);
      const pairings = service.pairNextRound(standings);

      expect(pairings.filter((p) => p.isBye)).toHaveLength(1);
      expect(pairings).toHaveLength(4);
    });

    it("gives the bye to the lowest standing player without one", () => {
      const results: SwissMatchResult[] = [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
        { playerAId: 3, isBye: true },
      ];
      const standings = service.computeStandings(players(3), results);
      const pairings = service.pairNextRound(standings);

      const bye = pairings.find((p) => p.isBye)!;
      // Player 3 already had a bye, so it must go to the last one left: 2.
      expect(bye.playerAId).toBe(2);
    });

    it("never rematches an opponent across a full tournament", () => {
      const field = players(8);
      const results: SwissMatchResult[] = [];
      const seen = new Set<string>();

      for (let round = 0; round < 3; round++) {
        const standings = service.computeStandings(field, results);
        const pairings = service.pairNextRound(standings);

        for (const pairing of pairings) {
          if (pairing.isBye) continue;
          const key = [pairing.playerAId, pairing.playerBId!]
            .sort((a, b) => a - b)
            .join("-");
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }

        results.push(...playRound(pairings));
      }

      expect(seen.size).toBe(12);
    });

    it("pairs players inside their score bracket", () => {
      // After one round the three winners (1, 3, 5) must face each other
      // rather than dropping down to the losers.
      const field = players(6);
      const results: SwissMatchResult[] = [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
        { playerAId: 3, playerBId: 4, winnerId: 3, playerAScore: 2 },
        { playerAId: 5, playerBId: 6, winnerId: 5, playerAScore: 2 },
      ];

      const standings = service.computeStandings(field, results);
      const pairings = service.pairNextRound(standings);
      const winners = new Set([1, 3, 5]);

      const winnerVsWinner = pairings.filter(
        (p) =>
          !p.isBye && winners.has(p.playerAId) && winners.has(p.playerBId!),
      );

      expect(winnerVsWinner).toHaveLength(1);
    });

    it("excludes dropped players from the pairings", () => {
      const standings = service.computeStandings(players(6), []);
      const pairings = service.pairNextRound(standings, [3, 4]);

      const paired = pairings.flatMap((p) => [p.playerAId, p.playerBId]);
      expect(paired).not.toContain(3);
      expect(paired).not.toContain(4);
      expect(pairings).toHaveLength(2);
    });

    it("falls back to a rematch when no other pairing exists", () => {
      // Only two players, already paired: the rematch is unavoidable.
      const standings = service.computeStandings(players(2), [
        { playerAId: 1, playerBId: 2, winnerId: 1, playerAScore: 2 },
      ]);

      const pairings = service.pairNextRound(standings);

      expect(pairings).toHaveLength(1);
      expect(pairings[0].isBye).toBe(false);
      expect([pairings[0].playerAId, pairings[0].playerBId].sort()).toEqual([
        1, 2,
      ]);
    });

    it("returns nothing when every player dropped", () => {
      const standings = service.computeStandings(players(4), []);
      expect(service.pairNextRound(standings, [1, 2, 3, 4])).toEqual([]);
    });

    it("pairs a large field without blowing up", () => {
      const field = players(64);
      const results: SwissMatchResult[] = [];

      for (let round = 0; round < 6; round++) {
        const standings = service.computeStandings(field, results);
        const pairings = service.pairNextRound(standings);
        expect(pairings).toHaveLength(32);
        results.push(...playRound(pairings));
      }

      const standings = service.computeStandings(field, results);
      // Player 1 always wins: 6 victories, 18 points.
      expect(standings[0].playerId).toBe(1);
      expect(standings[0].points).toBe(18);
    });
  });
});
