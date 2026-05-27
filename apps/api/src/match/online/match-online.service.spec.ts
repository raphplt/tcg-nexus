import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { MatchOnlineService } from "./match-online.service";
import { Match, MatchStatus, MatchPhase } from "../entities/match.entity";
import { OnlineMatchSession, OnlineMatchSessionStatus } from "../entities/online-match-session.entity";
import { Deck } from "../../deck/entities/deck.entity";
import { SavedDeck } from "../../deck/entities/saved-deck.entity";
import { MatchService } from "../match.service";
import { OnlinePlaySupportService } from "./online-play-support.service";
import { User } from "../../user/entities/user.entity";
import { Player } from "../../player/entities/player.entity";
import { GameFinishedReason, GamePhase } from "../engine/models/enums";

describe("MatchOnlineService", () => {
  let service: MatchOnlineService;

  const mockMatchRepository = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
  };

  const mockOnlineSessionRepository = {
    create: jest.fn().mockImplementation((s) => ({
      status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
      seed: "123",
      playerADeckId: null,
      playerBDeckId: null,
      winnerPlayerId: null,
      endedReason: null,
      serializedState: null,
      eventLog: [],
      ...s,
    })),
    save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
    findOne: jest.fn(),
  };

  const mockDeckRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSavedDeckRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockMatchService = {
    startMatch: jest.fn(),
    reportScore: jest.fn(),
  };

  const mockOnlinePlaySupportService = {
    evaluateDeckEligibility: jest.fn(),
    createInitialGameState: jest.fn(),
    mapDeckToEngineCards: jest.fn(),
  };

  const mockUser: User = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as any;

  const mockPlayerA: Player = {
    id: 10,
    user: mockUser,
  } as any;

  const mockPlayerB: Player = {
    id: 20,
    user: { id: 2, email: "other@example.com", firstName: "Other", lastName: "Player" } as any,
  } as any;

  let mockMatchEntity: Match;
  let mockSessionEntity: OnlineMatchSession;

  beforeEach(async () => {
    mockMatchEntity = {
      id: 1,
      status: MatchStatus.SCHEDULED,
      playerA: mockPlayerA,
      playerB: mockPlayerB,
      playerAScore: 0,
      playerBScore: 0,
      round: 1,
      phase: MatchPhase.QUALIFICATION,
      onlineSession: null,
    } as any;

    mockSessionEntity = {
      id: 100,
      match: mockMatchEntity,
      status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
      seed: "123",
      playerADeckId: null,
      playerBDeckId: null,
      winnerPlayerId: null,
      endedReason: null,
      serializedState: null,
      eventLog: [],
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchOnlineService,
        { provide: getRepositoryToken(Match), useValue: mockMatchRepository },
        { provide: getRepositoryToken(OnlineMatchSession), useValue: mockOnlineSessionRepository },
        { provide: getRepositoryToken(Deck), useValue: mockDeckRepository },
        { provide: getRepositoryToken(SavedDeck), useValue: mockSavedDeckRepository },
        { provide: MatchService, useValue: mockMatchService },
        { provide: OnlinePlaySupportService, useValue: mockOnlinePlaySupportService },
      ],
    }).compile();

    service = module.get<MatchOnlineService>(MatchOnlineService);

    // Mock GameEngine methods to prevent type errors and allow clean execution
    const GameEngineClass = require("../engine/GameEngine").GameEngine;
    jest.spyOn(GameEngineClass.prototype, "getSanitizedState").mockReturnValue({} as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDeckEligibility", () => {
    it("should return deck eligibility successfully", async () => {
      mockMatchEntity.onlineSession = mockSessionEntity;
      mockMatchRepository.findOne.mockResolvedValue(mockMatchEntity);
      mockDeckRepository.find.mockResolvedValue([]);
      
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockSavedDeckRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getDeckEligibility(1, mockUser);

      expect(result).toBeDefined();
      expect(result.matchId).toBe(1);
      expect(result.slot).toBe("playerA");
      expect(result.sessionStatus).toBe(OnlineMatchSessionStatus.WAITING_FOR_DECKS);
    });

    it("should throw ForbiddenException if user is not in match", async () => {
      const matchWithDiffPlayers = {
        ...mockMatchEntity,
        playerA: { id: 11, user: { id: 11 } },
        playerB: { id: 22, user: { id: 22 } },
      };
      mockMatchRepository.findOne.mockResolvedValue(matchWithDiffPlayers);

      await expect(service.getDeckEligibility(1, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("upsertSession", () => {
    it("should allow choosing deck and start session when both players are ready", async () => {
      mockMatchEntity.status = MatchStatus.SCHEDULED;
      mockSessionEntity.playerADeckId = null;
      mockSessionEntity.playerBDeckId = 99; // Opponent deck is already ready
      mockMatchEntity.onlineSession = mockSessionEntity;

      mockMatchRepository.findOne.mockResolvedValue(mockMatchEntity);
      
      mockDeckRepository.findOne.mockResolvedValue({ id: 88, user: { id: 1 } });
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockSavedDeckRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      mockOnlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({ eligible: true });
      mockOnlinePlaySupportService.mapDeckToEngineCards.mockReturnValue([]);
      mockOnlinePlaySupportService.createInitialGameState.mockReturnValue({
        gamePhase: GamePhase.Play,
        players: {},
      });

      const result = await service.upsertSession(1, mockUser, 88);

      expect(result.status).toBe(OnlineMatchSessionStatus.ACTIVE);
      expect(mockMatchService.startMatch).toHaveBeenCalledWith(1, expect.any(Object));
      expect(mockOnlineSessionRepository.save).toHaveBeenCalled();
    });
  });

  describe("syncFinishedGameToMatch", () => {
    it("should correctly sync finished game score to match for playerA", async () => {
      mockMatchEntity.status = MatchStatus.IN_PROGRESS;
      mockSessionEntity.status = OnlineMatchSessionStatus.ACTIVE;
      mockSessionEntity.serializedState = { gamePhase: GamePhase.Play } as any;
      mockMatchEntity.onlineSession = mockSessionEntity;

      mockMatchRepository.findOne.mockResolvedValue(mockMatchEntity);

      const mockEngine = {
        dispatch: jest.fn().mockReturnValue([]),
        getState: jest.fn().mockReturnValue({
          gamePhase: GamePhase.Finished,
          winnerId: "10", // String of playerA.id
          winnerReason: GameFinishedReason.PrizeOut,
        }),
      };

      const GameEngineClass = require("../engine/GameEngine").GameEngine;
      jest.spyOn(GameEngineClass.prototype, "dispatch").mockImplementation(mockEngine.dispatch);
      jest.spyOn(GameEngineClass.prototype, "getState").mockImplementation(mockEngine.getState);

      await service.dispatchAction(1, mockUser, { playerId: "10", type: "PASS" as any });

      // Check if reportScore was called for playerA (winnerId: 10)
      expect(mockMatchService.reportScore).toHaveBeenCalledWith(1, expect.objectContaining({
        playerAScore: 1,
        playerBScore: 0,
        isForfeit: false,
      }));
    });

    it("should correctly sync finished game score to match for playerB", async () => {
      mockMatchEntity.status = MatchStatus.IN_PROGRESS;
      mockSessionEntity.status = OnlineMatchSessionStatus.ACTIVE;
      mockSessionEntity.serializedState = { gamePhase: GamePhase.Play } as any;
      mockMatchEntity.onlineSession = mockSessionEntity;

      mockMatchRepository.findOne.mockResolvedValue(mockMatchEntity);

      const mockEngine = {
        dispatch: jest.fn().mockReturnValue([]),
        getState: jest.fn().mockReturnValue({
          gamePhase: GamePhase.Finished,
          winnerId: "20", // String of playerB.id
          winnerReason: GameFinishedReason.PrizeOut,
        }),
      };

      const GameEngineClass = require("../engine/GameEngine").GameEngine;
      jest.spyOn(GameEngineClass.prototype, "dispatch").mockImplementation(mockEngine.dispatch);
      jest.spyOn(GameEngineClass.prototype, "getState").mockImplementation(mockEngine.getState);

      await service.dispatchAction(1, mockUser, { playerId: "10", type: "PASS" as any });

      // Check if reportScore was called for playerB (winnerId: 20)
      expect(mockMatchService.reportScore).toHaveBeenCalledWith(1, expect.objectContaining({
        playerAScore: 0,
        playerBScore: 1,
        isForfeit: false,
      }));
    });
  });
});
