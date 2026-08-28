import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { MatchStatus } from "../src/match/entities/match.entity";
import { CreateTournamentDto } from "../src/tournament/dto/create-tournament.dto";
import {
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

jest.setTimeout(120000);

/**
 * An organizer keeping score on paper reports a result for a game that already
 * happened. The score form was offered on matches still SCHEDULED while the API
 * only accepted IN_PROGRESS ones, so submitting always failed with a 400.
 */
describe("Match score reporting (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let organizer: TestUser;
  let tournamentId: number;
  let matchId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    organizer = await createAdminUser(httpServer, app, {
      firstName: "Score",
      lastName: "Organizer",
    });

    const startDate = new Date(Date.now() + 3_600_000);
    const dto: CreateTournamentDto = {
      name: `Score reporting tournament ${Date.now()}`,
      startDate,
      endDate: new Date(startDate.getTime() + 86_400_000),
      registrationDeadline: new Date(startDate.getTime() - 1_800_000),
      type: TournamentType.SINGLE_ELIMINATION,
      minPlayers: 2,
      maxPlayers: 2,
      isPublic: true,
    };

    const created = await request(httpServer)
      .post("/tournaments")
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send(dto)
      .expect(201);
    tournamentId = created.body.id;

    await request(httpServer)
      .patch(`/tournaments/${tournamentId}/status`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ status: TournamentStatus.REGISTRATION_OPEN })
      .expect(200);

    for (let index = 0; index < 2; index += 1) {
      const player = await createUser(httpServer, {
        firstName: "Score",
        lastName: `Player ${index + 1}`,
      });
      await getPlayerId(httpServer, player.accessToken);
      await request(httpServer)
        .post(`/tournaments/${tournamentId}/register`)
        .set("Authorization", `Bearer ${player.accessToken}`)
        .send({ notes: "" })
        .expect(201);
    }

    await request(httpServer)
      .patch(`/tournaments/${tournamentId}/status`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ status: TournamentStatus.REGISTRATION_CLOSED })
      .expect(200);

    await request(httpServer)
      .post(`/tournaments/${tournamentId}/start`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .expect(200);

    const matches = await request(httpServer)
      .get(`/tournaments/${tournamentId}/matches`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .expect(200);

    const scheduled = matches.body.matches.find(
      (match: { status: string }) => match.status === MatchStatus.SCHEDULED,
    );
    expect(scheduled).toBeDefined();
    matchId = scheduled.id;
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  it("accepts a score on a scheduled match of the current round", async () => {
    const response = await request(httpServer)
      .post(`/matches/${matchId}/report-score`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ playerAScore: 2, playerBScore: 1 });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(MatchStatus.FINISHED);
    expect(response.body.playerAScore).toBe(2);
    expect(response.body.playerBScore).toBe(1);
    expect(response.body.winner?.id).toBe(response.body.playerA?.id);
    expect(response.body.startedAt).not.toBeNull();
  });

  it("refuses a second score on a match already finished", async () => {
    const response = await request(httpServer)
      .post(`/matches/${matchId}/report-score`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ playerAScore: 0, playerBScore: 2 });

    expect(response.status).toBe(400);
  });
});
