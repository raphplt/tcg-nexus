import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { CreateTournamentDto } from "../src/tournament/dto/create-tournament.dto";
import {
  TournamentStatus,
  TournamentType,
} from "../src/tournament/entities/tournament.entity";
import {
  createAdminUser,
  createUser,
  getPlayerId,
  TestUser,
} from "./helpers/auth";
import { createE2eApp } from "./helpers/app";

jest.setTimeout(60000);

describe("TournamentController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let organizer: TestUser;
  let player: TestUser;
  let playerId: number;
  let tournamentId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;

    organizer = await createAdminUser(httpServer, app, {
      firstName: "Organizer",
      lastName: "Admin",
    });
    player = await createUser(httpServer, {
      firstName: "Player",
      lastName: "Test",
    });
    playerId = await getPlayerId(httpServer, player.accessToken);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("POST /tournaments creates a tournament for an admin", async () => {
    const startDate = new Date(Date.now() + 86_400_000);
    const endDate = new Date(Date.now() + 172_800_000);
    const registrationDeadline = new Date(Date.now() + 43_200_000);

    const dto: CreateTournamentDto = {
      name: "E2E Tournament",
      startDate,
      endDate,
      registrationDeadline,
      type: TournamentType.SINGLE_ELIMINATION,
      minPlayers: 2,
      maxPlayers: 8,
      isPublic: true,
    };

    const response = await request(httpServer)
      .post("/tournaments")
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send(dto);

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.name).toBe(dto.name);
    expect(response.body.status).toBe(TournamentStatus.DRAFT);
    tournamentId = response.body.id;
  });

  it("PATCH /tournaments/:id/status opens registration", async () => {
    const response = await request(httpServer)
      .patch(`/tournaments/${tournamentId}/status`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ status: TournamentStatus.REGISTRATION_OPEN });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(TournamentStatus.REGISTRATION_OPEN);
  });

  it("POST /tournaments/:id/register registers a player", async () => {
    const response = await request(httpServer)
      .post(`/tournaments/${tournamentId}/register`)
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ playerId });

    expect(response.status).toBe(201);
    expect(response.body.player.id).toBe(playerId);
  });

  it("GET /tournaments/:id exposes the registered player publicly", async () => {
    const response = await request(httpServer).get(`/tournaments/${tournamentId}`);

    expect(response.status).toBe(200);
    expect(response.body.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: playerId }),
      ]),
    );
  });

  it("rejects tournament creation for a regular user", async () => {
    const response = await request(httpServer)
      .post("/tournaments")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({
        name: "Forbidden Tournament",
        startDate: new Date(Date.now() + 86_400_000),
        endDate: new Date(Date.now() + 172_800_000),
        type: TournamentType.SINGLE_ELIMINATION,
      });

    expect(response.status).toBe(403);
  });
});
