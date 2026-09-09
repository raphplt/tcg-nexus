import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { DataSource } from "typeorm";
import { Card } from "../src/card/entities/card.entity";
import { MatchStatus } from "../src/match/entities/match.entity";
import { MatchResultService } from "../src/match/match-result.service";
import { MatchService } from "../src/match/match.service";
import { DeckLegalityAndCorrections1789400000000 } from "../src/migrations/1789400000000-DeckLegalityAndCorrections";
import { RankedMatchHistory } from "../src/ranking/entities/ranked-match-history.entity";
import { RankingService } from "../src/ranking/ranking.service";
import { DeckLegalityStatus } from "../src/tournament/entities/tournament-deck-snapshot.entity";
import { TournamentDeckSnapshotRevision } from "../src/tournament/entities/tournament-deck-snapshot-revision.entity";
import { DeckLegalityService } from "../src/tournament/services/deck-legality.service";
import { Match } from "../src/match/entities/match.entity";
import { MatchResultProposal } from "../src/match/entities/match-result-proposal.entity";
import { ProposalStatus } from "../src/common/enums/match-result-status";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../src/tournament/entities/tournament.entity";
import { createE2eApp } from "./helpers/app";
import {
  createAdminUser,
  createUser,
  getPlayerId,
  TestUser,
} from "./helpers/auth";
import { ensureCard } from "./helpers/marketplace";

jest.setTimeout(60000);

describe("Tournament legality and corrections (PostgreSQL)", () => {
  let app: INestApplication;
  let server: Server;
  let database: DataSource;
  let legality: DeckLegalityService;
  let ranking: RankingService;
  let matchResults: MatchResultService;
  let matches: MatchService;
  let organizer: TestUser;
  let card: Card;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    server = app.getHttpServer() as Server;
    database = app.get(DataSource);
    legality = app.get(DeckLegalityService);
    ranking = app.get(RankingService);
    matchResults = app.get(MatchResultService);
    matches = app.get(MatchService);
    organizer = await createAdminUser(server, app);
    card = await ensureCard(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("deck legality", () => {
    it("refuses a fabricated card and reports a real one honestly", async () => {
      // The audited defect: 60 copies of a card nobody knows passed as valid.
      const fabricated = await legality.validate(
        [{ cardId: "made-up-card", name: "Made up", quantity: 60 }],
        "POKEMON_STANDARD_2026",
      );
      expect(fabricated.status).toBe(DeckLegalityStatus.INVALID);
      expect(fabricated.errors[0]).toContain("introuvable dans le catalogue");

      const real = await legality.validate(
        [{ cardId: card.id, name: card.name ?? "Card", quantity: 60 }],
        "POKEMON_STANDARD_2026",
      );
      // A catalog card without rule data is unverified, never silently legal.
      expect([
        DeckLegalityStatus.INVALID,
        DeckLegalityStatus.UNVERIFIED,
      ]).toContain(real.status);
      expect(real.status).not.toBe(DeckLegalityStatus.VALID);
    });

    it("refuses an unknown rule set as unverified rather than valid", async () => {
      const result = await legality.validate(
        [{ cardId: card.id, name: "Card", quantity: 60 }],
        "HOUSE_RULES_3000",
      );

      expect(result.status).not.toBe(DeckLegalityStatus.VALID);
      expect(result.unknowns.length).toBeGreaterThan(0);
    });
  });

  describe("rating corrections", () => {
    it("reverses the rating a corrected match had applied", async () => {
      const winner = await createUser(server);
      const loser = await createUser(server);
      const before = await Promise.all([
        ranking.getEloForUser(winner.id),
        ranking.getEloForUser(loser.id),
      ]);

      const applied = await ranking.updateEloWithHistory(
        winner.id,
        loser.id,
        { matchId: 987654 },
        false,
      );
      expect(await ranking.getEloForUser(winner.id)).toBe(applied.winnerElo);

      const reversed = await ranking.reverseMatchElo(
        987654,
        "Score correction",
      );

      expect(reversed).toBe(1);
      expect(await ranking.getEloForUser(winner.id)).toBe(before[0]);
      expect(await ranking.getEloForUser(loser.id)).toBe(before[1]);
      const [history] = await database
        .getRepository(RankedMatchHistory)
        .find({ where: { matchId: 987654 } });
      // The history is kept and marked, not deleted, so the graph stays honest.
      expect(history.reversedAt).toBeTruthy();
      expect(history.reversalReason).toBe("Score correction");

      // A reversed rating no longer counts as applied.
      expect(await ranking.reverseMatchElo(987654, "again")).toBe(0);
    });
  });

  // Declared last: rebuilding the columns from the migration leaves the migrated
  // types in place, which later assertions on this database do not expect.
  it("applies and rolls back its migration on the live database", async () => {
    const migration = new DeckLegalityAndCorrections1789400000000();
    const runner = database.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      expect(
        await runner.query(
          `SELECT 1 FROM information_schema.tables
            WHERE table_name = 'tournament_deck_snapshot_revision'`,
        ),
      ).toHaveLength(0);

      await migration.up(runner);
      const columns = await runner.query(
        `SELECT column_name FROM information_schema.columns
          WHERE (table_name = 'tournament_deck_snapshot'
                 AND column_name IN ('legalityStatus', 'revision'))
             OR (table_name = 'ranked_match_history' AND column_name = 'reversedAt')`,
      );
      expect(columns).toHaveLength(3);
      expect(
        await database.getRepository(TournamentDeckSnapshotRevision).count(),
      ).toBeGreaterThanOrEqual(0);
    } finally {
      await runner.release();
    }
  });

  describe("score confirmation", () => {
    let tournamentId: number;
    let playerOne: TestUser;
    let playerTwo: TestUser;
    let match: Match;

    /** Seeds a running tournament with one pairing between two players. */
    beforeAll(async () => {
      playerOne = await createUser(server);
      playerTwo = await createUser(server);
      const playerOneId = await getPlayerId(server, playerOne.accessToken);
      const playerTwoId = await getPlayerId(server, playerTwo.accessToken);

      const tournament = await database.getRepository(Tournament).save({
        name: `Confirmation E2E ${Date.now()}`,
        startDate: new Date(Date.now() - 3_600_000),
        endDate: new Date(Date.now() + 86_400_000),
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.IN_PROGRESS,
        isPublic: true,
        organizer: { id: organizer.id },
      } as unknown as Tournament);
      tournamentId = tournament.id;

      match = await database.getRepository(Match).save({
        tournament,
        playerA: { id: playerOneId },
        playerB: { id: playerTwoId },
        round: 1,
        status: MatchStatus.IN_PROGRESS,
        playerAScore: 0,
        playerBScore: 0,
      } as unknown as Match);
      match = await database.getRepository(Match).findOneOrFail({
        where: { id: match.id },
        relations: ["playerA", "playerA.user", "playerB", "playerB.user"],
      });
    });

    it("serializes concurrent proposals on the same match", async () => {
      const proposerId = match.playerA.user.id;

      const responses = await Promise.allSettled([
        matchResults.proposeResult(match.id, proposerId, {
          playerAScore: 2,
          playerBScore: 0,
        }),
        matchResults.proposeResult(match.id, proposerId, {
          playerAScore: 2,
          playerBScore: 1,
        }),
      ]);

      expect(
        responses.filter((entry) => entry.status === "fulfilled"),
      ).toHaveLength(2);
      const pending = await database.getRepository(MatchResultProposal).count({
        where: {
          match: { id: match.id },
          status: ProposalStatus.PENDING_CONFIRMATION,
        },
      });
      // A superseded proposal leaves exactly one awaiting confirmation.
      expect(pending).toBe(1);
    });

    it("commits the confirmation and the official result together", async () => {
      const confirmed = await matchResults.respondResult(
        match.id,
        match.playerB.user.id,
        { accept: true },
      );

      expect(confirmed.match.status).toBe(MatchStatus.FINISHED);
      const stored = await database
        .getRepository(Match)
        .findOneByOrFail({ id: match.id });
      expect(stored.playerAScore).toBe(2);
      expect(
        await database.getRepository(MatchResultProposal).count({
          where: {
            match: { id: match.id },
            status: ProposalStatus.CONFIRMED,
          },
        }),
      ).toBe(1);
    });

    it("leaves no confirmed proposal when the official result is rejected", async () => {
      // The match is already finished, so reporting it again rejects; the
      // audited defect confirmed the proposal before finding that out.
      const proposals = database.getRepository(MatchResultProposal);
      const before = await proposals.count({
        where: { match: { id: match.id }, status: ProposalStatus.CONFIRMED },
      });

      await expect(
        matchResults.respondResult(match.id, match.playerB.user.id, {
          accept: true,
        }),
      ).rejects.toBeTruthy();

      expect(
        await proposals.count({
          where: { match: { id: match.id }, status: ProposalStatus.CONFIRMED },
        }),
      ).toBe(before);
    });
  });
});
