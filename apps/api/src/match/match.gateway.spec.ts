import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserRole } from "../common/enums/user";
import { User } from "../user/entities/user.entity";
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";
import { MatchGateway } from "./match.gateway";
import { MatchOnlineService } from "./online/match-online.service";

describe("MatchGateway", () => {
  let gateway: MatchGateway;

  const mockUserRepo = {
    findOne: jest.fn(),
  };
  const mockJwtService = {
    verifyAsync: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((k) => (k === "JWT_SECRET" ? "secret" : null)),
  };
  const mockMatchOnlineService = {
    getSessionView: jest.fn(),
    getSessionViewsByUser: jest.fn().mockResolvedValue(new Map()),
    getSpectatorView: jest.fn().mockResolvedValue(null),
    dispatchAction: jest.fn(),
    respondPrompt: jest.fn(),
  };
  const mockCasualMatchService = {
    getSessionView: jest.fn(),
    getSessionViewsByUser: jest.fn().mockResolvedValue(new Map()),
    dispatchAction: jest.fn(),
    respondPrompt: jest.fn(),
  };
  const mockMatchmakingService = {
    registerMatchFoundHandler: jest.fn(),
    registerMatchFailedHandler: jest.fn(),
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    getQueueSize: jest.fn().mockReturnValue(1),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchGateway,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MatchOnlineService, useValue: mockMatchOnlineService },
        { provide: CasualMatchService, useValue: mockCasualMatchService },
        { provide: MatchmakingService, useValue: mockMatchmakingService },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      }),
      emit: jest.fn(),
    } as any;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should register matchmaking handlers", () => {
      gateway.onModuleInit();
      expect(
        mockMatchmakingService.registerMatchFoundHandler,
      ).toHaveBeenCalled();
      expect(
        mockMatchmakingService.registerMatchFailedHandler,
      ).toHaveBeenCalled();
    });
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
        email: "p1@tcg.org",
        role: UserRole.USER,
      });

      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        email: "p1@tcg.org",
        role: UserRole.USER,
        isActive: true,
      });

      await gateway.handleConnection(client);

      expect(client.data.user).toEqual({
        id: 1,
        email: "p1@tcg.org",
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

    it("should remove user socket on disconnect", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 }, currentMatchId: 10 },
      };

      await gateway.handleDisconnect(client);
      expect(mockMatchmakingService.leaveQueue).toHaveBeenCalledWith(1);
    });
  });

  describe("handleMatchmakingJoin & handleMatchmakingLeave", () => {
    it("should join matchmaking queue", async () => {
      const client: any = {
        data: { user: { id: 1 } },
        join: jest.fn(),
        emit: jest.fn(),
      };

      await gateway.handleMatchmakingJoin({ deckId: 5 }, client);

      expect(client.join).toHaveBeenCalledWith("matchmaking:1");
      expect(mockMatchmakingService.joinQueue).toHaveBeenCalledWith(
        1,
        5,
        false,
      );
    });

    it("should leave matchmaking queue", async () => {
      const client: any = {
        data: { user: { id: 1 } },
        leave: jest.fn(),
        emit: jest.fn(),
      };

      await gateway.handleMatchmakingLeave(client);

      expect(client.leave).toHaveBeenCalledWith("matchmaking:1");
      expect(mockMatchmakingService.leaveQueue).toHaveBeenCalledWith(1);
    });
  });

  describe("tournament match events (join, leave, action, prompt)", () => {
    it("should handle join_match as player and as spectator", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockMatchOnlineService.getSessionView.mockResolvedValue({
        slot: "playerA",
        enginePlayerId: "p1",
        gameState: { turn: 1 },
      });

      const result = await gateway.handleJoinMatch({ matchId: 10 }, client);
      expect(result).toEqual({
        status: "joined",
        matchId: 10,
        enginePlayerId: "p1",
      });
      expect(client.join).toHaveBeenCalledWith("match:10");
      expect(client.emit).toHaveBeenCalledWith(
        "session_view",
        expect.any(Object),
      );

      // Spectator test
      mockMatchOnlineService.getSessionView.mockResolvedValue({
        slot: "spectator",
        enginePlayerId: null,
        gameState: { turn: 1 },
      });

      const specResult = await gateway.handleJoinMatch({ matchId: 10 }, client);
      expect(specResult).toEqual({
        status: "spectating",
        matchId: 10,
        enginePlayerId: null,
      });
    });

    it("should handle leave_match", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 }, currentMatchId: 10 },
        leave: jest.fn(),
      };

      const result = await gateway.handleLeaveMatch({ matchId: 10 }, client);
      expect(result).toEqual({ status: "left" });
      expect(client.leave).toHaveBeenCalledWith("match:10");
    });

    it("should dispatch match action and broadcast state", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        emit: jest.fn(),
      };

      mockMatchOnlineService.dispatchAction.mockResolvedValue({
        events: [],
      });
      mockMatchOnlineService.getSessionViewsByUser.mockResolvedValue(new Map());
      mockMatchOnlineService.getSpectatorView.mockResolvedValue(null);

      const result = await gateway.handleDispatchAction(
        { matchId: 10, action: { type: "pass_turn" } as any },
        client,
      );

      expect(result).toEqual({ status: "success" });
      expect(mockMatchOnlineService.dispatchAction).toHaveBeenCalled();
    });

    it("should respond to match prompt", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        emit: jest.fn(),
      };

      mockMatchOnlineService.respondPrompt.mockResolvedValue({
        events: [],
      });
      mockMatchOnlineService.getSessionViewsByUser.mockResolvedValue(new Map());
      mockMatchOnlineService.getSpectatorView.mockResolvedValue(null);

      const result = await gateway.handleRespondPrompt(
        {
          matchId: 10,
          response: { type: "choose_cards", selectedCards: [] } as any,
        },
        client,
      );

      expect(result).toEqual({ status: "success" });
    });
  });

  describe("casual match events (join, leave, action, prompt)", () => {
    it("should handle casual_join and casual_leave", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
      };

      mockCasualMatchService.getSessionView.mockResolvedValue({
        enginePlayerId: "p1",
        gameState: { turn: 1 },
      });

      const joinResult = await gateway.handleCasualJoin(
        { sessionId: 20 },
        client,
      );
      expect(joinResult).toEqual({
        status: "joined",
        sessionId: 20,
        enginePlayerId: "p1",
      });

      const leaveResult = await gateway.handleCasualLeave(
        { sessionId: 20 },
        client,
      );
      expect(leaveResult).toEqual({ status: "left" });
    });

    it("should handle casual_dispatch_action and casual_respond_prompt", async () => {
      const client: any = {
        id: "sock-1",
        data: { user: { id: 1 } },
        emit: jest.fn(),
      };

      mockCasualMatchService.dispatchAction.mockResolvedValue({ events: [] });
      mockCasualMatchService.respondPrompt.mockResolvedValue({ events: [] });
      mockCasualMatchService.getSessionViewsByUser.mockResolvedValue(new Map());

      const actionRes = await gateway.handleCasualDispatchAction(
        { sessionId: 20, action: { type: "attack" } as any },
        client,
      );
      expect(actionRes).toEqual({ status: "success" });

      const promptRes = await gateway.handleCasualRespondPrompt(
        { sessionId: 20, response: { type: "confirm" } as any },
        client,
      );
      expect(promptRes).toEqual({ status: "success" });
    });
  });
});
