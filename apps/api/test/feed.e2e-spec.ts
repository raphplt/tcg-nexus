import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { getRepositoryToken } from "@nestjs/typeorm";
import cookieParser from "cookie-parser";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { AppModule } from "./../src/app.module";
import { DeckFormat } from "./../src/deck-format/entities/deck-format.entity";
import { createUser, TestUser } from "./helpers/auth";

jest.setTimeout(60000);

const passThroughGuard = { canActivate: () => true };

describe("FeedController (e2e)", () => {
  let app: INestApplication;
  let httpServer: Server;
  let follower: TestUser;
  let leader: TestUser;
  let formatId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(passThroughGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    httpServer = app.getHttpServer() as Server;

    follower = await createUser(httpServer, {
      firstName: "Feed",
      lastName: "Follower",
    });
    leader = await createUser(httpServer, {
      firstName: "Feed",
      lastName: "Leader",
    });

    const formatRepo = app.get<Repository<DeckFormat>>(
      getRepositoryToken(DeckFormat),
    );
    let format = await formatRepo.findOne({ where: {} });
    if (!format) {
      format = await formatRepo.save(
        formatRepo.create({ type: `E2E-Feed-${Date.now()}` }),
      );
    }
    formatId = format.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it("rejects GET /feed without authentication", async () => {
    const response = await request(httpServer).get("/feed");
    expect(response.status).toBe(401);
  });

  it("returns empty feed when the user follows nobody", async () => {
    const response = await request(httpServer)
      .get("/feed")
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns deck_created event after follower follows a leader who publishes a deck", async () => {
    const followResponse = await request(httpServer)
      .post(`/users/${leader.id}/follow`)
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(followResponse.status).toBe(201);

    const deckResponse = await request(httpServer)
      .post("/deck")
      .set("Authorization", `Bearer ${leader.accessToken}`)
      .send({
        deckName: "Feed Deck Public",
        isPublic: true,
        formatId,
        cards: [],
      });
    expect(deckResponse.status).toBe(201);

    const feedResponse = await request(httpServer)
      .get("/feed")
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(feedResponse.status).toBe(200);
    const deckEvents = feedResponse.body.filter(
      (item: { type: string }) => item.type === "deck_created",
    );
    expect(deckEvents.length).toBeGreaterThan(0);
    const publicDeck = deckEvents.find(
      (item: { deck?: { name: string } }) =>
        item.deck?.name === "Feed Deck Public",
    );
    expect(publicDeck).toBeDefined();
    expect(publicDeck.actor.id).toBe(leader.id);
  });

  it("does not expose private decks in the feed", async () => {
    await request(httpServer)
      .post("/deck")
      .set("Authorization", `Bearer ${leader.accessToken}`)
      .send({
        deckName: "Feed Deck Private",
        isPublic: false,
        formatId,
        cards: [],
      });

    const feedResponse = await request(httpServer)
      .get("/feed")
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(feedResponse.status).toBe(200);
    const privateDeck = feedResponse.body.find(
      (item: { deck?: { name: string } }) =>
        item.deck?.name === "Feed Deck Private",
    );
    expect(privateDeck).toBeUndefined();
  });

  it("respects the limit query parameter", async () => {
    const feedResponse = await request(httpServer)
      .get("/feed?limit=1")
      .set("Authorization", `Bearer ${follower.accessToken}`);
    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.length).toBeLessThanOrEqual(1);
  });
});
