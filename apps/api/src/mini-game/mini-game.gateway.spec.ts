import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Card } from "../card/entities/card.entity";
import { UserRole } from "../common/enums/user";
import { SealedProduct } from "../sealed-product/entities/sealed-product.entity";
import { User } from "../user/entities/user.entity";
import { MiniGameType } from "./dto/mini-game-events.dto";
import { MiniGameGateway } from "./mini-game.gateway";

describe("MiniGameGateway", () => {
  let gateway: MiniGameGateway;

  const mockCardRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockSealedRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((k) => (k === "JWT_SECRET" ? "secret" : null)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MiniGameGateway,
        { provide: getRepositoryToken(Card), useValue: mockCardRepo },
        {
          provide: getRepositoryToken(SealedProduct),
          useValue: mockSealedRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<MiniGameGateway>(MiniGameGateway);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("handleConnection and handleDisconnect", () => {
    it("should authenticate client on connection", async () => {
      const client: any = {
        id: "sock-1",
        handshake: {
          headers: { cookie: "accessToken=jwt.token.123" },
        },
        data: {},
        disconnect: jest.fn(),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: "u1@tcg.org",
        role: UserRole.USER,
      });

      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        email: "u1@tcg.org",
        role: UserRole.USER,
        isActive: true,
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual({
        id: 1,
        email: "u1@tcg.org",
        role: UserRole.USER,
      });
    });

    it("should disconnect unauthenticated client", async () => {
      const client: any = {
        id: "sock-1",
        handshake: { headers: {} },
        data: {},
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it("should handle client disconnect", () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
      };

      gateway.handleDisconnect(client);
      expect(true).toBe(true);
    });
  });

  describe("handleJoinQueue & handleLeaveQueue & matchmaking pairing", () => {
    it("should allow first user to join mini game queue", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1, email: "u1@tcg.org" } },
        emit: jest.fn(),
      };
      mockUserRepo.findOne.mockResolvedValue({ id: 1, email: "u1@tcg.org" });

      const result = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX, params: { roundCount: 3 } },
        client,
      );
      expect(result).toEqual({ status: "queued" });
    });

    it("should pair two users when second joins same queue", async () => {
      const client1: any = {
        id: "sock-1",
        data: { user: { id: 1, email: "u1@tcg.org" } },
        emit: jest.fn(),
      };
      const client2: any = {
        id: "sock-2",
        data: { user: { id: 2, email: "u2@tcg.org" } },
        emit: jest.fn(),
      };
      mockUserRepo.findOne.mockImplementation(({ where: { id } }) =>
        Promise.resolve({ id, email: `u${id}@tcg.org` }),
      );

      await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX },
        client1,
      );
      const matchResult = await gateway.handleJoinQueue(
        { gameType: MiniGameType.JUSTE_PRIX },
        client2,
      );

      expect(matchResult.status).toBe("matched");
      expect(matchResult.sessionId).toBeDefined();
    });

    it("should allow user to leave queue", () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        emit: jest.fn(),
      };

      const result = gateway.handleLeaveQueue(client);
      expect(result).toEqual({ status: "left" });
    });
  });

  describe("gameplay: join room, ready, open pack, and guess", () => {
    const setupActiveSession = (
      gameType: "case_opening" | "juste_prix" = "juste_prix",
    ) => {
      const sessionId = "sess-123";
      const session: any = {
        id: sessionId,
        gameType,
        players: [
          {
            userId: 1,
            userName: "u1",
            socketId: "sock-1",
            score: 0,
            ready: false,
            openedPacks: [],
            guesses: [],
          },
          {
            userId: 2,
            userName: "u2",
            socketId: "sock-2",
            score: 0,
            ready: false,
            openedPacks: [],
            guesses: [],
          },
        ],
        state: "waiting",
        round: 0,
        maxRounds: 2,
        items: [
          [
            [{ id: "c1", pricing: { cardmarket: { trend: "10.0" } } }],
            [{ id: "c2", pricing: { cardmarket: { trend: "15.0" } } }],
          ],
          [
            [{ id: "c3", pricing: { cardmarket: { trend: "20.0" } } }],
            [{ id: "c4", pricing: { cardmarket: { trend: "25.0" } } }],
          ],
        ],
        roundStartedAt: Date.now(),
      };

      (gateway as any).activeSessions.set(sessionId, session);
      return { sessionId, session };
    };

    it("should join minigame room", () => {
      const { sessionId } = setupActiveSession();
      const client: any = {
        id: "sock-1-new",
        data: { user: { id: 1 } },
        join: jest.fn(),
        emit: jest.fn(),
      };

      const result = gateway.handleJoinRoom({ sessionId }, client);
      expect(result).toEqual({ status: "joined" });
      expect(client.join).toHaveBeenCalledWith(`minigame:room:${sessionId}`);
    });

    it("should handle ready flag and advance state when all players ready", () => {
      const { sessionId, session } = setupActiveSession();
      const client1: any = { data: { user: { id: 1 } } };
      const client2: any = { data: { user: { id: 2 } } };

      const r1 = gateway.handleReady({ sessionId }, client1);
      expect(r1).toEqual({ status: "ok" });
      expect(session.state).toBe("waiting");

      const r2 = gateway.handleReady({ sessionId }, client2);
      expect(r2).toEqual({ status: "ok" });
      expect(session.state).toBe("playing");
      expect(session.round).toBe(1);
    });

    it("should handle pack opening in case_opening mode", async () => {
      const { sessionId, session } = setupActiveSession("case_opening");
      session.state = "playing";
      session.round = 1;

      const client: any = { data: { user: { id: 1 } } };

      const result = await gateway.handleOpenPack({ sessionId }, client);
      expect(result.status).toBe("ok");
      expect(result.cards).toHaveLength(1);
      expect(session.players[0].score).toBe(10);
    });

    it("should submit guess in juste_prix mode and compute score", () => {
      const { sessionId, session } = setupActiveSession("juste_prix");
      session.state = "playing";
      session.round = 1;
      session.items = [
        {
          type: "card",
          data: { id: "c1", pricing: { cardmarket: { trend: "50.0" } } },
        },
      ];

      const client: any = { data: { user: { id: 1 } } };

      const result = gateway.handleSubmitGuess(
        { sessionId, guess: 48 },
        client,
      );

      expect(result.status).toBe("ok");
      expect(session.players[0].guesses).toHaveLength(1);
      expect(session.players[0].guesses[0].points).toBeGreaterThan(0);
    });
  });
});
