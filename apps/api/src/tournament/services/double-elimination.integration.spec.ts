import { FindOperator } from "typeorm";
import { MatchService } from "../../match/match.service";
import {
  BracketSide,
  Match,
  MatchStatus,
} from "../../match/entities/match.entity";
import { OnlineMatchSession } from "../../match/entities/online-match-session.entity";
import { Player } from "../../player/entities/player.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";
import { BracketService } from "./bracket.service";
import { SwissPairingService } from "./swiss-pairing.service";

/**
 * In-memory stand-in for the pieces of `EntityManager` the bracket code uses.
 *
 * The propagation is the critical path of every elimination tournament, so it
 * is exercised against the real services rather than against mocks returning
 * canned answers.
 */
class FakeEntityManager {
  readonly matches: Match[] = [];
  readonly registrations: TournamentRegistration[] = [];
  private readonly sessions: OnlineMatchSession[] = [];
  private sequence = 1;

  constructor(readonly tournament: Tournament) {}

  private store(entity: unknown): any[] {
    if (entity === Match) return this.matches;
    if (entity === TournamentRegistration) return this.registrations;
    if (entity === OnlineMatchSession) return this.sessions;
    if (entity === Tournament) return [this.tournament];
    return [];
  }

  private matches_(row: any, where: any): boolean {
    if (!where) return true;

    return Object.entries(where).every(([key, expected]) => {
      const actual = row[key];

      if (expected instanceof FindOperator) {
        return (expected.value as unknown[]).includes(actual);
      }

      if (expected && typeof expected === "object" && "id" in expected) {
        return actual?.id === (expected as { id: number }).id;
      }

      return actual === expected;
    });
  }

  private select(entity: unknown, options: any): any[] {
    const rows = this.store(entity).filter((row) =>
      this.matches_(row, options?.where),
    );

    if (options?.order?.round) {
      rows.sort((a, b) => a.round - b.round);
    }

    return rows;
  }

  create(entity: unknown, data: any): any {
    if (entity === Match) {
      return { id: 0, isBye: false, ...data } as Match;
    }
    return { id: 0, ...data };
  }

  async save(entity: unknown, data?: any): Promise<any> {
    const row = data ?? entity;
    const target = data === undefined ? this.storeOf(row) : this.store(entity);

    if (!row.id) {
      row.id = this.sequence++;
    }
    if (!target.includes(row)) {
      target.push(row);
    }

    return row;
  }

  private storeOf(row: any): any[] {
    if ("bracketSide" in row || "playerAScore" in row) return this.matches;
    if ("eliminatedAt" in row) return this.registrations;
    return [];
  }

  async findOne(entity: unknown, options: any): Promise<any> {
    return this.select(entity, options)[0] ?? null;
  }

  async find(entity: unknown, options: any): Promise<any[]> {
    return this.select(entity, options);
  }

  async count(entity: unknown, options: any): Promise<number> {
    return this.select(entity, options).length;
  }

  getRepository(entity: unknown): any {
    return {
      create: (data: any) => this.create(entity, data),
      save: (data: any) => this.save(entity, data),
      find: (options: any) => this.find(entity, options),
      findOne: (options: any) => this.findOne(entity, options),
    };
  }
}

const buildPlayers = (count: number): Player[] =>
  Array.from(
    { length: count },
    (_, index) =>
      ({
        id: index + 1,
        user: { firstName: `P${index + 1}`, lastName: "Test" },
      }) as unknown as Player,
  );

const buildTournament = (
  type: TournamentType,
  players: Player[],
  grandFinalReset: boolean,
): Tournament =>
  ({
    id: 1,
    name: "T",
    type,
    status: TournamentStatus.IN_PROGRESS,
    grandFinalReset,
    minPlayers: 2,
    maxPlayers: players.length,
    currentRound: 1,
    totalRounds: 0,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-01-02"),
    matches: [],
    registrations: players.map((player) => ({
      status: RegistrationStatus.CONFIRMED,
      checkedIn: true,
      player,
      eliminatedAt: null,
      eliminatedRound: null,
    })),
  }) as unknown as Tournament;

/**
 * Generates a bracket into the fake store and hands back the pieces needed to
 * replay it.
 */
async function startTournament(options: {
  type: TournamentType;
  playerCount: number;
  grandFinalReset?: boolean;
}) {
  const players = buildPlayers(options.playerCount);
  const tournament = buildTournament(
    options.type,
    players,
    options.grandFinalReset ?? true,
  );
  const manager = new FakeEntityManager(tournament);

  for (const registration of tournament.registrations) {
    registration.tournament = tournament;
    await manager.save(TournamentRegistration, registration);
  }

  const bracketService = new BracketService(
    { findOne: async () => tournament, save: async () => tournament } as any,
    manager.getRepository(Match),
    {
      seedPlayers: async (list: Player[]) =>
        list.map((player, index) => ({ ...player, seed: index + 1 })),
    } as any,
    new SwissPairingService(),
  );

  await bracketService.generateBracket(1, { manager: manager as any });

  const matchService = new MatchService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { emit: jest.fn() } as any,
    {} as any,
    { updateTournamentRankings: jest.fn().mockResolvedValue([]) } as any,
    new SwissPairingService(),
  );

  return { manager, matchService, tournament };
}

/**
 * Plays every pending match until the bracket runs dry, letting the given
 * function pick each winner.
 */
async function playOut(
  manager: FakeEntityManager,
  matchService: MatchService,
  pickWinner: (match: Match) => Player,
): Promise<{ finished: boolean; playedRounds: number[] }> {
  const playedRounds: number[] = [];
  let finished = false;
  let guard = 0;

  while (guard++ < 200) {
    const playable = manager.matches.filter(
      (match) =>
        match.status === MatchStatus.SCHEDULED &&
        match.playerA &&
        match.playerB,
    );

    if (playable.length === 0) break;

    // Always take the earliest step, the way a tournament is actually run.
    const round = Math.min(...playable.map((match) => match.round));
    const match = playable.find((candidate) => candidate.round === round)!;

    match.winner = pickWinner(match);
    match.status = MatchStatus.FINISHED;
    match.finishedAt = new Date();
    playedRounds.push(match.round);

    finished =
      (await (matchService as any).advanceEliminationBracket(
        manager.tournament,
        match,
        manager,
      )) || finished;
  }

  return { finished, playedRounds };
}

const bestSeedWins = (match: Match): Player =>
  match.playerA!.id <= match.playerB!.id ? match.playerA! : match.playerB!;

const defeatsOf = (manager: FakeEntityManager, playerId: number): number =>
  manager.matches.filter(
    (match) =>
      !match.isBye &&
      match.status === MatchStatus.FINISHED &&
      [match.playerA?.id, match.playerB?.id].includes(playerId) &&
      match.winner?.id !== playerId,
  ).length;

describe("elimination tournaments end to end", () => {
  it("plays an eight-player double elimination through to the title", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 8,
    });

    expect(manager.matches).toHaveLength(14);
    expect(tournament.totalRounds).toBe(6);

    const { finished } = await playOut(manager, matchService, bestSeedWins);

    expect(finished).toBe(true);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);

    const grandFinal = manager.matches.find(
      (match) => match.bracketSide === BracketSide.GRAND_FINAL,
    )!;
    expect(grandFinal.winner?.id).toBe(1);

    // Everyone but the champion leaves on their second defeat.
    for (let playerId = 2; playerId <= 8; playerId++) {
      expect(defeatsOf(manager, playerId)).toBe(2);
    }
    expect(defeatsOf(manager, 1)).toBe(0);

    const eliminated = manager.registrations.filter(
      (registration) => registration.eliminatedAt,
    );
    expect(eliminated).toHaveLength(7);
    expect(
      eliminated.some((registration) => registration.player.id === 1),
    ).toBe(false);
  });

  it("plays a deciding grand final when the losers finalist wins", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 4,
    });

    // The losers bracket finalist always sits in slot B of the grand final.
    const { finished } = await playOut(manager, matchService, (match) =>
      match.bracketSide === BracketSide.GRAND_FINAL
        ? match.playerB!
        : bestSeedWins(match),
    );

    const grandFinals = manager.matches.filter(
      (match) => match.bracketSide === BracketSide.GRAND_FINAL,
    );

    expect(grandFinals).toHaveLength(2);
    expect(grandFinals[1].round).toBe(grandFinals[0].round + 1);
    expect(tournament.totalRounds).toBe(grandFinals[1].round);
    expect(finished).toBe(true);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);
  });

  it("stops at a single grand final when the reset is disabled", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 4,
      grandFinalReset: false,
    });

    const { finished } = await playOut(manager, matchService, (match) =>
      match.bracketSide === BracketSide.GRAND_FINAL
        ? match.playerB!
        : bestSeedWins(match),
    );

    expect(
      manager.matches.filter(
        (match) => match.bracketSide === BracketSide.GRAND_FINAL,
      ),
    ).toHaveLength(1);
    expect(finished).toBe(true);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);
  });

  it("stops at a single grand final when the winners finalist holds on", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 4,
    });

    await playOut(manager, matchService, (match) =>
      match.bracketSide === BracketSide.GRAND_FINAL
        ? match.playerA!
        : bestSeedWins(match),
    );

    expect(
      manager.matches.filter(
        (match) => match.bracketSide === BracketSide.GRAND_FINAL,
      ),
    ).toHaveLength(1);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);
  });

  it.each([
    6, 7, 11,
  ])("carries a %i-player field through its byes", async (playerCount) => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount,
    });

    const { finished } = await playOut(manager, matchService, bestSeedWins);

    expect(finished).toBe(true);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);

    for (let playerId = 2; playerId <= playerCount; playerId++) {
      expect(defeatsOf(manager, playerId)).toBe(2);
    }
    expect(defeatsOf(manager, 1)).toBe(0);
  });

  it("still runs a single elimination bracket on the same links", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.SINGLE_ELIMINATION,
      playerCount: 8,
    });

    expect(manager.matches).toHaveLength(7);

    const { finished } = await playOut(manager, matchService, bestSeedWins);

    expect(finished).toBe(true);
    expect(tournament.status).toBe(TournamentStatus.FINISHED);

    for (let playerId = 2; playerId <= 8; playerId++) {
      expect(defeatsOf(manager, playerId)).toBe(1);
    }
    expect(
      manager.registrations.filter((registration) => registration.eliminatedAt),
    ).toHaveLength(7);
  });

  it("takes a propagated player back out when the result is reset", async () => {
    const { manager, matchService } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 4,
    });

    const opener = manager.matches.find(
      (match) => match.round === 1 && match.playerA && match.playerB,
    )!;

    opener.winner = bestSeedWins(opener);
    opener.status = MatchStatus.FINISHED;
    await (matchService as any).advanceEliminationBracket(
      manager.tournament,
      opener,
      manager,
    );

    const nextMatch = manager.matches.find(
      (match) => match.id === opener.nextMatchId,
    )!;
    const dropMatch = manager.matches.find(
      (match) => match.id === opener.loserNextMatchId,
    )!;
    expect(nextMatch.playerA ?? nextMatch.playerB).toBeDefined();
    expect(dropMatch.playerA ?? dropMatch.playerB).toBeDefined();

    await (matchService as any).withdrawBracketPropagation(opener, manager);

    expect(nextMatch.playerA).toBeNull();
    expect(dropMatch.playerA).toBeNull();
  });

  it("advances the current round step by step", async () => {
    const { manager, matchService, tournament } = await startTournament({
      type: TournamentType.DOUBLE_ELIMINATION,
      playerCount: 8,
    });

    const { playedRounds } = await playOut(manager, matchService, bestSeedWins);

    // Steps are played in order and both branches share the same numbering.
    expect(playedRounds).toEqual([...playedRounds].sort((a, b) => a - b));
    expect(new Set(playedRounds)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(tournament.currentRound).toBe(6);
  });
});
