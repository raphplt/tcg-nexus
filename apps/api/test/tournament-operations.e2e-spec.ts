import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { CreateTournamentDto } from "../src/tournament/dto/create-tournament.dto";
import {
  TournamentStatus,
  TournamentType,
} from "../src/tournament/entities/tournament.entity";
import { MatchStatus } from "../src/match/entities/match.entity";
import { DeckVisibilityPolicy } from "../src/common/enums/deck-visibility-policy";
import {
  MatchResultStatus,
  ProposalStatus,
} from "../src/common/enums/match-result-status";
import { RoundControlAction } from "../src/tournament/dto/tournament-incident.dto";
import { createE2eApp } from "./helpers/app";
import {
  createAdminUser,
  createUser,
  getPlayerId,
  TestUser,
} from "./helpers/auth";

jest.setTimeout(60000);

describe("Tournament Operations (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let organizer: TestUser;
  let playerA: TestUser;
  let playerB: TestUser;
  let playerAId: number;
  let playerBId: number;
  let tournamentId: number;
  let matchId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    organizer = await createAdminUser(httpServer, app, {
      firstName: "Organizer",
      lastName: "Operations",
    });
    playerA = await createUser(httpServer, {
      firstName: "Alice",
      lastName: "Ash",
    });
    playerB = await createUser(httpServer, {
      firstName: "Bob",
      lastName: "Oak",
    });

    playerAId = await getPlayerId(httpServer, playerA.accessToken);
    playerBId = await getPlayerId(httpServer, playerB.accessToken);

    const startDate = new Date(Date.now() + 86_400_000);
    const endDate = new Date(Date.now() + 172_800_000);
    const registrationDeadline = new Date(Date.now() + 43_200_000);

    const dto: CreateTournamentDto = {
      name: "Operations E2E Tournament",
      startDate,
      endDate,
      registrationDeadline,
      type: TournamentType.SINGLE_ELIMINATION,
      minPlayers: 2,
      maxPlayers: 2,
      isPublic: true,
      deckVisibilityPolicy: DeckVisibilityPolicy.ALWAYS_PRIVATE,
    };

    const res = await request(httpServer)
      .post("/tournaments")
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send(dto);

    tournamentId = res.body.id;

    await request(httpServer)
      .patch(`/tournaments/${tournamentId}/status`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ status: TournamentStatus.REGISTRATION_OPEN });

    await request(httpServer)
      .post(`/tournaments/${tournamentId}/register`)
      .set("Authorization", `Bearer ${playerA.accessToken}`)
      .send({ notes: "Alice ready" });

    await request(httpServer)
      .post(`/tournaments/${tournamentId}/register`)
      .set("Authorization", `Bearer ${playerB.accessToken}`)
      .send({ notes: "Bob ready" });
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  describe("Deck Snapshot Submission & Masking (TRN-02)", () => {
    it("submits a 60-card deck snapshot for Player A", async () => {
      const cards = Array.from({ length: 60 }, (_, i) => ({
        cardId: `card-${i + 1}`,
        name: `Pikachu Card ${i + 1}`,
        quantity: 1,
        supertype: "Pokémon",
      }));

      const res = await request(httpServer)
        .post(`/tournaments/${tournamentId}/deck-snapshot`)
        .set("Authorization", `Bearer ${playerA.accessToken}`)
        .send({
          deckName: "Alice Turbo Lightning",
          cards,
        });

      expect(res.status).toBe(200);
      expect(res.body.deckName).toBe("Alice Turbo Lightning");
      expect(res.body.cardCount).toBe(60);
      expect(res.body.cards).toHaveLength(60);
    });

    it("allows Player A to view own full deck snapshot", async () => {
      const res = await request(httpServer)
        .get(`/tournaments/${tournamentId}/my-deck-snapshot`)
        .set("Authorization", `Bearer ${playerA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deckName).toBe("Alice Turbo Lightning");
      expect(res.body.cards).toHaveLength(60);
    });

    it("masks cards for Player B viewing snapshots under ALWAYS_PRIVATE policy", async () => {
      const res = await request(httpServer)
        .get(`/tournaments/${tournamentId}/deck-snapshots`)
        .set("Authorization", `Bearer ${playerB.accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const aliceSnapshot = res.body.find((s: any) => s.playerId === playerAId);
      expect(aliceSnapshot).toBeDefined();
      expect(aliceSnapshot.cards).toHaveLength(0);
      expect(aliceSnapshot.cardCount).toBe(60);
    });
  });

  describe("Tournament Start & Match Result Proposals (TRN-01)", () => {
    it("starts tournament and retrieves scheduled match", async () => {
      await request(httpServer)
        .patch(`/tournaments/${tournamentId}/status`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .send({ status: TournamentStatus.REGISTRATION_CLOSED })
        .expect(200);

      await request(httpServer)
        .post(`/tournaments/${tournamentId}/start`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .expect(200);

      const matchesRes = await request(httpServer)
        .get(`/tournaments/${tournamentId}/matches`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .expect(200);

      const scheduled = matchesRes.body.matches.find(
        (m: { status: string }) => m.status === MatchStatus.SCHEDULED,
      );
      expect(scheduled).toBeDefined();
      matchId = scheduled.id;
    });

    it("allows Player A to propose a match result", async () => {
      const res = await request(httpServer)
        .post(`/matches/${matchId}/propose-result`)
        .set("Authorization", `Bearer ${playerA.accessToken}`)
        .send({ playerAScore: 2, playerBScore: 1 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ProposalStatus.PENDING_CONFIRMATION);
      expect(res.body.playerAScore).toBe(2);
      expect(res.body.playerBScore).toBe(1);
    });

    it("allows Player B to dispute the proposed score", async () => {
      const res = await request(httpServer)
        .post(`/matches/${matchId}/respond-result`)
        .set("Authorization", `Bearer ${playerB.accessToken}`)
        .send({ accept: false, disputeReason: "Score was 2-0 not 2-1" });

      expect(res.status).toBe(200);
      expect(res.body.proposal.status).toBe(ProposalStatus.DISPUTED);
      expect(res.body.match.resultStatus).toBe(MatchResultStatus.DISPUTED);
    });

    it("allows organizer to resolve dispute and finalize match", async () => {
      const res = await request(httpServer)
        .post(`/matches/${matchId}/resolve-dispute`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .send({
          playerAScore: 2,
          playerBScore: 0,
          reason: "Verified slip from tournament table",
        });

      expect(res.status).toBe(200);
      expect(res.body.match.status).toBe(MatchStatus.FINISHED);
      expect(res.body.match.resultStatus).toBe(MatchResultStatus.CONFIRMED);
      expect(res.body.match.playerAScore).toBe(2);
      expect(res.body.match.playerBScore).toBe(0);
    });
  });

  describe("Round Clock Control & Status (TRN-03)", () => {
    it("allows organizer to start round clock", async () => {
      const res = await request(httpServer)
        .post(`/tournaments/${tournamentId}/round-clock`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .send({ action: RoundControlAction.START, durationMinutes: 50 });

      expect(res.status).toBe(200);
      expect(res.body.roundStartedAt).toBeDefined();
      expect(res.body.isRoundPaused).toBe(false);

      const clockRes = await request(httpServer)
        .get(`/tournaments/${tournamentId}/round-clock`)
        .set("Authorization", `Bearer ${playerA.accessToken}`);

      expect(clockRes.status).toBe(200);
      expect(clockRes.body.remainingSeconds).toBeGreaterThan(0);
    });

    it("allows organizer to pause round clock", async () => {
      const res = await request(httpServer)
        .post(`/tournaments/${tournamentId}/round-clock`)
        .set("Authorization", `Bearer ${organizer.accessToken}`)
        .send({ action: RoundControlAction.PAUSE });

      expect(res.status).toBe(200);
      expect(res.body.isRoundPaused).toBe(true);

      const clockRes = await request(httpServer)
        .get(`/tournaments/${tournamentId}/round-clock`)
        .set("Authorization", `Bearer ${playerA.accessToken}`);

      expect(clockRes.status).toBe(200);
      expect(clockRes.body.isRoundPaused).toBe(true);
    });
  });

  describe("Explainable Standings (TRN-04)", () => {
    it("fetches explainable standings with tiebreaker fields", async () => {
      const res = await request(httpServer)
        .get(`/tournaments/${tournamentId}/standings`)
        .set("Authorization", `Bearer ${playerA.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tournamentId).toBe(tournamentId);
      expect(res.body.ruleVersion).toBe("POKEMON_SWISS_TIEBREAK_V1");
      expect(Array.isArray(res.body.standings)).toBe(true);
    });
  });

  describe("Player Tournament Dashboard & Mid-Tournament Drop (TRN-05)", () => {
    it("fetches player dashboard for Player B", async () => {
      const res = await request(httpServer)
        .get(`/tournaments/${tournamentId}/player-dashboard`)
        .set("Authorization", `Bearer ${playerB.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.tournamentId).toBe(tournamentId);
      expect(res.body.isDropped).toBe(false);
      expect(res.body.deckStatus.isSubmitted).toBe(false);
    });

    it("allows Player B to drop from the tournament", async () => {
      const res = await request(httpServer)
        .post(`/tournaments/${tournamentId}/drop-player`)
        .set("Authorization", `Bearer ${playerB.accessToken}`)
        .send({ reason: "Emergency departure" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain(
        "has been dropped from future pairings",
      );

      const dashboardRes = await request(httpServer)
        .get(`/tournaments/${tournamentId}/player-dashboard`)
        .set("Authorization", `Bearer ${playerB.accessToken}`);

      expect(dashboardRes.body.isDropped).toBe(true);
    });
  });
});
