import { INestApplication } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { CreateTournamentDto } from "../src/tournament/dto/create-tournament.dto";
import {
  TournamentStatus,
  TournamentType,
} from "../src/tournament/entities/tournament.entity";
import { RegistrationStatus } from "../src/tournament/entities/tournament-registration.entity";
import { createE2eApp } from "./helpers/app";
import {
  createAdminUser,
  createUser,
  getPlayerId,
  TestUser,
} from "./helpers/auth";

jest.setTimeout(120000);

interface RegisteredTestUser {
  user: TestUser;
  playerId: number;
}

describe("Tournament registration concurrency (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let organizer: TestUser;
  let players: RegisteredTestUser[];
  let tournamentId: number;

  beforeAll(async () => {
    ({ app } = await createE2eApp());
    httpServer = app.getHttpServer() as Server;
    organizer = await createAdminUser(httpServer, app, {
      firstName: "Concurrency",
      lastName: "Organizer",
    });

    players = [];
    for (let index = 0; index < 4; index += 1) {
      const user = await createUser(httpServer, {
        firstName: "Concurrent",
        lastName: `Player ${index + 1}`,
      });
      const playerId = await getPlayerId(httpServer, user.accessToken);
      players.push({ user, playerId });
    }

    const startDate = new Date(Date.now() + 86_400_000);
    const tournamentDto: CreateTournamentDto = {
      name: `Concurrency tournament ${Date.now()}`,
      startDate,
      endDate: new Date(startDate.getTime() + 86_400_000),
      registrationDeadline: new Date(startDate.getTime() - 3_600_000),
      type: TournamentType.SINGLE_ELIMINATION,
      minPlayers: 2,
      maxPlayers: 2,
      isPublic: true,
    };

    const creationResponse = await request(httpServer)
      .post("/tournaments")
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send(tournamentDto)
      .expect(201);
    tournamentId = creationResponse.body.id;

    await request(httpServer)
      .patch(`/tournaments/${tournamentId}/status`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .send({ status: TournamentStatus.REGISTRATION_OPEN })
      .expect(200);
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  it("serializes simultaneous registrations and waitlist promotions", async () => {
    const registrationResponses = await Promise.all(
      players.map(({ user }) =>
        request(httpServer)
          .post(`/tournaments/${tournamentId}/register`)
          .set("Authorization", `Bearer ${user.accessToken}`)
          .send({ notes: "Concurrent registration" }),
      ),
    );

    expect(
      registrationResponses.every((response) => response.status === 201),
    ).toBe(true);

    const registrations = registrationResponses.map((response, index) => ({
      player: players[index],
      playerId: response.body.player.id as number,
      status: response.body.status as RegistrationStatus,
    }));
    const confirmedRegistrations = registrations.filter(
      (registration) => registration.status === RegistrationStatus.CONFIRMED,
    );
    const waitlistedRegistrations = registrations.filter(
      (registration) => registration.status === RegistrationStatus.WAITLISTED,
    );

    expect(confirmedRegistrations).toHaveLength(2);
    expect(waitlistedRegistrations).toHaveLength(2);
    expect(new Set(registrations.map(({ playerId }) => playerId))).toEqual(
      new Set(players.map(({ playerId }) => playerId)),
    );

    const initialSnapshotResponse = await request(httpServer)
      .get(`/tournaments/${tournamentId}/registrations`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .expect(200);
    const initialSnapshot = initialSnapshotResponse.body as Array<{
      status: RegistrationStatus;
    }>;
    expect(
      initialSnapshot.filter(
        (registration) => registration.status === RegistrationStatus.CONFIRMED,
      ),
    ).toHaveLength(2);
    expect(
      initialSnapshot.filter(
        (registration) => registration.status === RegistrationStatus.WAITLISTED,
      ),
    ).toHaveLength(2);

    const cancellationResponses = await Promise.all(
      confirmedRegistrations.map(({ player }) =>
        request(httpServer)
          .delete(`/tournaments/${tournamentId}/register/${player.playerId}`)
          .set("Authorization", `Bearer ${player.user.accessToken}`),
      ),
    );
    expect(
      cancellationResponses.every((response) => response.status === 204),
    ).toBe(true);

    const registrationsResponse = await request(httpServer)
      .get(`/tournaments/${tournamentId}/registrations`)
      .set("Authorization", `Bearer ${organizer.accessToken}`)
      .expect(200);

    const finalRegistrations = registrationsResponse.body as Array<{
      player: { id: number };
      status: RegistrationStatus;
    }>;
    const finalConfirmedPlayerIds = finalRegistrations
      .filter(
        (registration) => registration.status === RegistrationStatus.CONFIRMED,
      )
      .map((registration) => registration.player.id)
      .sort((left, right) => left - right);
    const originalWaitlistedPlayerIds = waitlistedRegistrations
      .map(({ playerId }) => playerId)
      .sort((left, right) => left - right);

    expect(finalConfirmedPlayerIds).toEqual(originalWaitlistedPlayerIds);
    expect(
      finalRegistrations.filter(
        (registration) => registration.status === RegistrationStatus.WAITLISTED,
      ),
    ).toHaveLength(0);
    expect(
      finalRegistrations.filter(
        (registration) => registration.status === RegistrationStatus.CANCELLED,
      ),
    ).toHaveLength(2);
  });
});
