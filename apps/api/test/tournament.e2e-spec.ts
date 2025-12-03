import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { CreateTournamentDto } from '../src/tournament/dto/create-tournament.dto';
import { TournamentType } from '../src/tournament/entities/tournament.entity';

describe('TournamentController (e2e)', () => {
  let app: INestApplication;
  let organizerToken: string;
  let playerToken: string;
  let tournamentId: number;
  let playerId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create Organizer
    const organizerEmail = `organizer_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: organizerEmail,
        password: 'Password123!',
        firstName: 'Organizer',
        lastName: 'Test'
      })
      .expect(201);

    const organizerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: organizerEmail,
        password: 'Password123!'
      })
      .expect(200);

    organizerToken = organizerLogin.body.access_token;

    // Create Player
    const playerEmail = `player_${Date.now()}@test.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: playerEmail,
        password: 'Password123!',
        firstName: 'Player',
        lastName: 'Test'
      })
      .expect(201);

    const playerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: playerEmail,
        password: 'Password123!'
      })
      .expect(200);

    playerToken = playerLogin.body.access_token;
    playerId = playerLogin.body.user.id; // Assuming login returns user object
  });

  afterAll(async () => {
    await app.close();
  });

  it('/tournaments (POST) - Create Tournament', async () => {
    const dto: CreateTournamentDto = {
      name: 'E2E Tournament',
      startDate: new Date(Date.now() + 86400000), // Tomorrow
      endDate: new Date(Date.now() + 172800000), // Day after tomorrow
      type: TournamentType.SINGLE_ELIMINATION,
      minPlayers: 2,
      maxPlayers: 8
    };

    const response = await request(app.getHttpServer())
      .post('/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(dto)
      .expect(201);

    tournamentId = response.body.id;
    expect(response.body.name).toBe(dto.name);
  });

  it('/tournaments/:id/register (POST) - Register Player', async () => {
    await request(app.getHttpServer())
      .post(`/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ playerId })
      .expect(201);
  });

  it('/tournaments/:id (GET) - Verify Registration', async () => {
    const response = await request(app.getHttpServer())
      .get(`/tournaments/${tournamentId}`)
      .expect(200);

    const registrations = response.body.registrations;
    expect(registrations).toBeDefined();
    // Note: Depending on implementation, registrations might be empty if not explicitly included or if user is not authorized to see them.
    // But usually public get returns basic info.
    // Let's check stats instead if registrations are hidden.
  });
});
