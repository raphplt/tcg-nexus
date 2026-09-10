import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { MiniGameType } from "./dto/mini-game-events.dto";
import { MiniGameItemsService } from "./mini-game-items.service";
import { MiniGameGateway, RECONNECT_GRACE_MS } from "./mini-game.gateway";

type Emitted = { target: string | null; event: string; payload: any };

describe("MiniGameGateway", () => {
  let gateway: MiniGameGateway;
  let emitted: Emitted[];

  const mockUserRepo = { findOne: jest.fn() };
  const mockJwtService = { verifyAsync: jest.fn() };
  const mockConfigService = {
    get: jest.fn((k: string) => (k === "JWT_SECRET" ? "secret" : null)),
  };

  const card = (id: string, trend: number, name = `Card ${id}`) => ({
    id,
    name,
    pricing: { cardmarket: { trend } },
  });

  const mockItems = {
    buildJustePrixItems: jest.fn(),
    buildCaseOpeningPacks: jest.fn(),
    localizeCards: jest.fn(
      async (
        cards: any[],
        locale: string,
        options?: { keepPricing?: boolean },
      ) =>
        cards.map((c) => {
          const copy = { ...c, name: `${c.name} [${locale}]` };
          if (!options?.keepPricing) delete copy.pricing;
          return copy;
        }),
    ),
    localizeJustePrixItem: jest.fn(async (item: any, locale: string) => ({
      type: item.type,
      id: item.id,
      data: { id: item.data.id, name: `${item.data.name} [${locale}]` },
    })),
  };

  const client = (id: number, socketId = `sock-${id}`, locale = "fr"): any => ({
    id: socketId,
    data: { user: { id, email: `u${id}@tcg.org` }, locale },
    emit: jest.fn((event: string, payload: any) =>
      emitted.push({ target: socketId, event, payload }),
    ),
    join: jest.fn(),
    handshake: { headers: {} },
    disconnect: jest.fn(),
  });

  const eventsTo = (target: string | null, event: string) =>
    emitted.filter((e) => e.target === target && e.event === event);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    emitted = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiniGameGateway,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MiniGameItemsService, useValue: mockItems },
      ],
    }).compile();

    gateway = module.get<MiniGameGateway>(MiniGameGateway);
    gateway.server = {
      to: jest.fn((target: string) => ({
        emit: jest.fn((event: string, payload: any) =>
          emitted.push({ target, event, payload }),
        ),
      })),
      emit: jest.fn((event: string, payload: any) =>
        emitted.push({ target: null, event, payload }),
      ),
    } as any;

    mockUserRepo.findOne.mockImplementation(({ where: { id } }: any) =>
      Promise.resolve({ id, email: `u${id}@tcg.org`, isActive: true }),
    );
    mockItems.buildJustePrixItems.mockImplementation(async (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        type: "card",
        id: `item-${i}`,
        price: 50,
        data: card(`item-${i}`, 50),
      })),
    );
    mockItems.buildCaseOpeningPacks.mockImplementation(
      async (rounds: number, players: number) =>
        Array.from({ length: rounds }, (_, r) =>
          Array.from({ length: players }, (_, p) => [
            card(`r${r}p${p}a`, 10 * (p + 1)),
            card(`r${r}p${p}b`, 5),
          ]),
        ),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Queues two players into a duel and joins both to the room. */
  async function startDuel(
    gameType: MiniGameType,
    params: any = { roundCount: 2 },
  ) {
    const c1 = client(1);
    const c2 = client(2, "sock-2", "en");
    await gateway.handleJoinQueue({ gameType, params }, c1);
    const match = await gateway.handleJoinQueue({ gameType, params }, c2);
    const sessionId = (match as any).sessionId as string;
    await gateway.handleJoinRoom({ sessionId }, c1);
    await gateway.handleJoinRoom({ sessionId }, c2);
    emitted = [];
    return {
      c1,
      c2,
      sessionId,
      session: (gateway as any).activeSessions.get(sessionId),
    };
  }

  async function readyBoth(sessionId: string, c1: any, c2: any) {
    await gateway.handleReady({ sessionId }, c1);
    await gateway.handleReady({ sessionId }, c2);
  }

  describe("connection", () => {
    it("authenticates the client and records its locale", async () => {
      const c: any = {
        id: "sock-1",
        handshake: {
          headers: {
            cookie: "accessToken=jwt.token.123",
            "accept-language": "en-US,en;q=0.9",
          },
        },
        data: {},
        disconnect: jest.fn(),
      };
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 1 });
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        email: "u1@tcg.org",
        role: UserRole.USER,
        isActive: true,
      });

      await gateway.handleConnection(c);

      expect(c.data.user).toEqual({
        id: 1,
        email: "u1@tcg.org",
        role: UserRole.USER,
      });
      expect(c.data.locale).toBe("en");
    });

    it("disconnects a client without token", async () => {
      const c: any = {
        id: "s",
        handshake: { headers: {} },
        data: {},
        disconnect: jest.fn(),
      };
      await gateway.handleConnection(c);
      expect(c.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe("matchmaking", () => {
    it("queues the first player", async () => {
      const result = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX, params: { roundCount: 3 } },
        client(1),
      );
      expect(result).toEqual({ status: "queued" });
    });

    it("only pairs players who asked for the same duel", async () => {
      await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX, params: { roundCount: 3 } },
        client(1),
      );
      const mismatch = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX, params: { roundCount: 5 } },
        client(2),
      );
      expect(mismatch.status).toBe("queued");

      const withSet = await gateway.handleJoinQueue(
        {
          gameType: MiniGameType.JUSTE_PRIX,
          params: { roundCount: 3, setId: "sv01" },
        },
        client(3),
      );
      expect(withSet.status).toBe("queued");

      const match = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX, params: { roundCount: 3 } },
        client(4),
      );
      expect(match.status).toBe("matched");
      expect(mockItems.buildJustePrixItems).toHaveBeenCalledWith(3, undefined);
    });

    it("keeps duels apart by booster style and series", async () => {
      await gateway.handleJoinQueue(
        {
          gameType: MiniGameType.CASE_OPENING,
          params: { roundCount: 3, serieId: "sv", packStyle: "premium" },
        },
        client(1),
      );
      const otherStyle = await gateway.handleJoinQueue(
        {
          gameType: MiniGameType.CASE_OPENING,
          params: { roundCount: 3, serieId: "sv", packStyle: "chase" },
        },
        client(2),
      );
      expect(otherStyle.status).toBe("queued");

      const match = await gateway.handleJoinQueue(
        {
          gameType: MiniGameType.CASE_OPENING,
          params: { roundCount: 3, serieId: "sv", packStyle: "premium" },
        },
        client(3),
      );
      expect(match.status).toBe("matched");
      expect(mockItems.buildCaseOpeningPacks).toHaveBeenCalledWith(3, 2, {
        setId: undefined,
        serieId: "sv",
        style: "premium",
      });

      const state = eventsTo("sock-3", "minigame_state_update")[0]?.payload;
      expect(state).toBeUndefined();
    });

    it("tells each player who they are and never ships the items", async () => {
      const c1 = client(1);
      const c2 = client(2);
      await gateway.handleJoinQueue({ gameType: MiniGameType.JUSTE_PRIX }, c1);
      await gateway.handleJoinQueue({ gameType: MiniGameType.JUSTE_PRIX }, c2);

      const toFirst = eventsTo("sock-1", "minigame_matched")[0]!.payload;
      const toSecond = eventsTo("sock-2", "minigame_matched")[0]!.payload;
      expect(toFirst.selfId).toBe(1);
      expect(toFirst.opponentId).toBe(2);
      expect(toSecond.selfId).toBe(2);
      expect(toFirst).not.toHaveProperty("items");
      expect(toFirst.roundCount).toBe(5);
    });

    it("reports an error to both players when the catalog cannot fill a game", async () => {
      mockItems.buildJustePrixItems.mockRejectedValue(new Error("empty"));
      const c1 = client(1);
      const c2 = client(2);
      await gateway.handleJoinQueue({ gameType: MiniGameType.JUSTE_PRIX }, c1);
      const result = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX },
        c2,
      );

      expect(result.status).toBe("error");
      expect(eventsTo("sock-1", "minigame_error")).toHaveLength(1);
      expect(eventsTo("sock-2", "minigame_error")).toHaveLength(1);
      expect((gateway as any).activeSessions.size).toBe(0);
    });

    it("lets a player leave the queue", async () => {
      const c = client(1);
      await gateway.handleJoinQueue({ gameType: MiniGameType.JUSTE_PRIX }, c);
      expect(gateway.handleLeaveQueue(c)).toEqual({ status: "left" });
      expect((gateway as any).matchmakingQueue).toHaveLength(0);
    });
  });

  describe("juste prix", () => {
    it("starts round 1 once both are ready, with a server deadline", async () => {
      const { c1, c2, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );

      await gateway.handleReady({ sessionId }, c1);
      expect(session.state).toBe("waiting");

      await readyBoth(sessionId, c1, c2);
      expect(session.state).toBe("playing");
      expect(session.round).toBe(1);
      expect(session.roundDurationMs).toBe(20_000);

      const state = eventsTo("sock-2", "minigame_state_update").at(-1)!.payload;
      expect(state.roundDurationMs).toBe(20_000);
      expect(state.currentItem.data.name).toBe("Card item-0 [en]");
      expect(state.currentItem).not.toHaveProperty("price");
    });

    it("hides the opponent's guess until the round is revealed", async () => {
      const { c1, c2, sessionId } = await startDuel(MiniGameType.JUSTE_PRIX);
      await readyBoth(sessionId, c1, c2);
      emitted = [];

      await gateway.handleSubmitGuess({ sessionId, guess: 48 }, c1);

      const seenByOpponent = eventsTo("sock-2", "minigame_state_update").at(
        -1,
      )!.payload;
      const first = seenByOpponent.players.find((p: any) => p.userId === 1);
      expect(first.hasGuessed).toBe(true);
      expect(first.guesses).toEqual([]);
      expect(
        eventsTo(`minigame:room:${sessionId}`, "minigame_round_reveal"),
      ).toHaveLength(0);
    });

    it("reveals after both guesses, state first then reveal", async () => {
      const { c1, c2, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );
      await readyBoth(sessionId, c1, c2);
      emitted = [];

      await gateway.handleSubmitGuess({ sessionId, guess: 50 }, c1);
      await gateway.handleSubmitGuess({ sessionId, guess: 10 }, c2);

      const events = emitted.map((e) => e.event);
      const lastState = events.lastIndexOf("minigame_state_update");
      const reveal = events.indexOf("minigame_round_reveal");
      expect(reveal).toBeGreaterThan(lastState);

      const payload = emitted[reveal]!.payload;
      expect(payload.correctPrice).toBe(50);
      expect(payload.guesses).toHaveLength(2);
      expect(session.players[0].score).toBe(1300);
      expect(session.players[1].score).toBe(0);

      const state = eventsTo("sock-1", "minigame_state_update").at(-1)!.payload;
      expect(state.players[1].guesses).toHaveLength(1);
    });

    it("rejects a second guess and a ready click during the round", async () => {
      const { c1, c2, sessionId } = await startDuel(MiniGameType.JUSTE_PRIX);
      await readyBoth(sessionId, c1, c2);

      await gateway.handleSubmitGuess({ sessionId, guess: 48 }, c1);
      expect(
        await gateway.handleSubmitGuess({ sessionId, guess: 48 }, c1),
      ).toEqual({ error: "Guess already submitted for this round" });
      expect(await gateway.handleReady({ sessionId }, c1)).toEqual({
        error: "Round still in progress",
      });
    });

    it("closes the round on the server when the timer runs out", async () => {
      const { c1, c2, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );
      await readyBoth(sessionId, c1, c2);
      await gateway.handleSubmitGuess({ sessionId, guess: 48 }, c1);
      emitted = [];

      await jest.advanceTimersByTimeAsync(21_000);

      expect(session.players[1].guesses).toEqual([
        { round: 1, guess: null, elapsedSeconds: 20, points: 0 },
      ]);
      expect(
        eventsTo(`minigame:room:${sessionId}`, "minigame_round_reveal"),
      ).toHaveLength(1);
    });

    it("advances rounds and finishes after the last one", async () => {
      const { c1, c2, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );
      await readyBoth(sessionId, c1, c2);

      await gateway.handleSubmitGuess({ sessionId, guess: 50 }, c1);
      await gateway.handleSubmitGuess({ sessionId, guess: 50 }, c2);
      await readyBoth(sessionId, c1, c2);
      expect(session.round).toBe(2);

      await gateway.handleSubmitGuess({ sessionId, guess: 1 }, c1);
      await gateway.handleSubmitGuess({ sessionId, guess: 1 }, c2);
      await readyBoth(sessionId, c1, c2);
      expect(session.state).toBe("finished");
      expect(session.roundTimer).toBeUndefined();
    });
  });

  describe("case opening", () => {
    it("opens the pre-drawn pack, scores it and localizes the cards per player", async () => {
      const { c1, c2, sessionId, session } = await startDuel(
        MiniGameType.CASE_OPENING,
      );
      await readyBoth(sessionId, c1, c2);
      emitted = [];

      const result: any = await gateway.handleOpenPack({ sessionId }, c2);

      expect(result.status).toBe("ok");
      expect(result.cards.map((c: any) => c.name)).toEqual([
        "Card r0p1a [en]",
        "Card r0p1b [en]",
      ]);
      expect(session.players[1].score).toBe(25);
      expect(await gateway.handleOpenPack({ sessionId }, c2)).toEqual({
        error: "Pack already opened for this round",
      });

      const stateForFirst = eventsTo("sock-1", "minigame_state_update").at(
        -1,
      )!.payload;
      expect(stateForFirst.players[1].openedPacks[0][0].name).toBe(
        "Card r0p1a [fr]",
      );
      expect(stateForFirst.players[1].openedPacks[0][0].pricing).toBeDefined();
      expect(stateForFirst.players[0].openedPacks).toEqual([]);
    });
  });

  describe("disconnection", () => {
    it("forfeits the duel after the grace period", async () => {
      const { c1, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );

      gateway.handleDisconnect(c1);

      expect(session.players[0].connected).toBe(false);
      expect(session.state).toBe("waiting");
      expect(
        eventsTo(`minigame:room:${sessionId}`, "minigame_player_connection")[0]!
          .payload,
      ).toMatchObject({
        userId: 1,
        connected: false,
        graceMs: RECONNECT_GRACE_MS,
      });

      await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);

      expect(session.state).toBe("finished");
      expect(session.forfeitedBy).toBe(1);
      expect(
        eventsTo(`minigame:room:${sessionId}`, "player_disconnected"),
      ).toHaveLength(1);
    });

    it("cancels the forfeit when the player comes back", async () => {
      const { c1, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );

      gateway.handleDisconnect(c1);
      await gateway.handleJoinRoom({ sessionId }, client(1, "sock-1-new"));
      await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);

      expect(session.state).toBe("waiting");
      expect(session.players[0].connected).toBe(true);
      expect(session.players[0].socketId).toBe("sock-1-new");
    });

    it("ignores a stale socket of a player who already reconnected", async () => {
      const { c1, sessionId, session } = await startDuel(
        MiniGameType.JUSTE_PRIX,
      );
      await gateway.handleJoinRoom({ sessionId }, client(1, "sock-1-new"));

      gateway.handleDisconnect(c1);
      await jest.advanceTimersByTimeAsync(RECONNECT_GRACE_MS);

      expect(session.players[0].connected).toBe(true);
      expect(session.state).toBe("waiting");
    });
  });
});
