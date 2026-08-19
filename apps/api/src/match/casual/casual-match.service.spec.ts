import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { Deck } from "../../deck/entities/deck.entity";
import { SavedDeck } from "../../deck/entities/saved-deck.entity";
import { Player } from "../../player/entities/player.entity";
import { RankingService } from "../../ranking/ranking.service";
import { User } from "../../user/entities/user.entity";
import { GameEngine } from "../engine/GameEngine";
import { GameFinishedReason, GamePhase } from "../engine/models/enums";
import {
  CasualMatchSession,
  CasualMatchSessionStatus,
} from "../entities/casual-match-session.entity";
import { OnlinePlaySupportService } from "../online/online-play-support.service";
import { CasualMatchService } from "./casual-match.service";

describe("CasualMatchService", () => {
  let service: CasualMatchService;
  let session: CasualMatchSession;

  const playerAUser = { id: 1, email: "a@test.com" } as User;
  const playerBUser = { id: 2, email: "b@test.com" } as User;

  const mockSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const mockDeckRepository = { find: jest.fn(), findOne: jest.fn() };
  const mockSavedDeckRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockPlayerRepository = { findOne: jest.fn() };
  const mockOnlinePlaySupportService = {
    evaluateDeckEligibility: jest.fn(),
    mapDeckToEngineCards: jest.fn(),
    createInitialGameState: jest.fn(),
  };
  const mockRankingService = { updateEloWithHistory: jest.fn() };
  const mockManager = { save: jest.fn(), findOne: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };

  /** Builds a session already started, with both engine players assigned. */
  const buildActiveSession = (): CasualMatchSession =>
    ({
      id: 42,
      playerA: playerAUser,
      playerB: playerBUser,
      status: CasualMatchSessionStatus.ACTIVE,
      seed: "123",
      isRanked: false,
      playerADeckId: 10,
      playerBDeckId: 20,
      winnerUserId: null,
      endedReason: null,
      serializedState: {
        playerIds: ["100", "200"],
        players: {},
        turnNumber: 3,
        gamePhase: GamePhase.Play,
      },
      eventLog: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as unknown as CasualMatchSession;

  beforeEach(async () => {
    session = buildActiveSession();

    mockDataSource.transaction.mockImplementation(
      (work: (manager: unknown) => unknown) =>
        Promise.resolve(work(mockManager)),
    );
    mockManager.save.mockImplementation(async (entity) => entity);
    // Both the locking read and the relations read return the same session.
    mockManager.findOne.mockImplementation(async () => session);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasualMatchService,
        {
          provide: getRepositoryToken(CasualMatchSession),
          useValue: mockSessionRepository,
        },
        { provide: getRepositoryToken(Deck), useValue: mockDeckRepository },
        {
          provide: getRepositoryToken(SavedDeck),
          useValue: mockSavedDeckRepository,
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepository },
        {
          provide: OnlinePlaySupportService,
          useValue: mockOnlinePlaySupportService,
        },
        { provide: RankingService, useValue: mockRankingService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CasualMatchService>(CasualMatchService);

    mockSessionRepository.findOne.mockResolvedValue(session);
    jest
      .spyOn(GameEngine.prototype, "getSanitizedState")
      .mockReturnValue({} as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("dispatchAction", () => {
    it("overwrites the client-provided playerId with the authenticated slot", async () => {
      const dispatch = jest
        .spyOn(GameEngine.prototype, "dispatch")
        .mockReturnValue([]);
      jest.spyOn(GameEngine.prototype, "getState").mockReturnValue({
        gamePhase: GamePhase.Play,
        playerIds: ["100", "200"],
      } as never);

      await service.dispatchAction(42, playerBUser, {
        playerId: "100",
        type: "END_TURN",
      } as never);

      // playerB sits at index 1: spoofing playerA's id must not work.
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ playerId: "200" }),
      );
    });

    it("rejects a user who is not a participant", async () => {
      const intruder = { id: 999 } as User;

      await expect(
        service.dispatchAction(42, intruder, {
          playerId: "100",
          type: "END_TURN",
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuses to act on a session that is not active", async () => {
      session.status = CasualMatchSessionStatus.FINISHED;

      await expect(
        service.dispatchAction(42, playerAUser, {
          playerId: "100",
          type: "END_TURN",
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("autoForfeit", () => {
    it("surrenders on behalf of the disconnected player, not the active one", async () => {
      const dispatch = jest
        .spyOn(GameEngine.prototype, "dispatch")
        .mockReturnValue([{ type: "GAME_FINISHED" }] as never);
      jest.spyOn(GameEngine.prototype, "getState").mockReturnValue({
        gamePhase: GamePhase.Finished,
        winnerId: "100",
        winnerReason: GameFinishedReason.Forfeit,
        playerIds: ["100", "200"],
      } as never);

      // playerB left while it was playerA's turn.
      const result = await service.autoForfeit(42, playerBUser.id);

      expect(dispatch).toHaveBeenCalledWith({
        playerId: "200",
        type: "SURRENDER",
      });
      expect(result).not.toBeNull();
      expect(session.winnerUserId).toBe(playerAUser.id);
    });

    it("does nothing when the session is already over", async () => {
      session.status = CasualMatchSessionStatus.FINISHED;

      await expect(service.autoForfeit(42, playerBUser.id)).resolves.toBeNull();
    });

    it("updates the ELO only for ranked sessions", async () => {
      session.isRanked = true;
      jest.spyOn(GameEngine.prototype, "dispatch").mockReturnValue([]);
      jest.spyOn(GameEngine.prototype, "getState").mockReturnValue({
        gamePhase: GamePhase.Finished,
        winnerId: "100",
        winnerReason: GameFinishedReason.Forfeit,
        playerIds: ["100", "200"],
      } as never);
      mockRankingService.updateEloWithHistory.mockResolvedValue({});

      await service.autoForfeit(42, playerBUser.id);

      expect(mockRankingService.updateEloWithHistory).toHaveBeenCalledWith(
        playerAUser.id,
        playerBUser.id,
        { casualSessionId: 42 },
      );
    });

    it("keeps the match result when the ELO update fails", async () => {
      session.isRanked = true;
      jest.spyOn(GameEngine.prototype, "dispatch").mockReturnValue([]);
      jest.spyOn(GameEngine.prototype, "getState").mockReturnValue({
        gamePhase: GamePhase.Finished,
        winnerId: "100",
        winnerReason: GameFinishedReason.Forfeit,
        playerIds: ["100", "200"],
      } as never);
      mockRankingService.updateEloWithHistory.mockRejectedValue(
        new Error("ranking down"),
      );

      await expect(
        service.autoForfeit(42, playerBUser.id),
      ).resolves.not.toBeNull();
      expect(session.status).toBe(CasualMatchSessionStatus.FINISHED);
      expect(session.winnerUserId).toBe(playerAUser.id);
    });
  });

  describe("hasOngoingSession", () => {
    it("reports an ongoing game so the player cannot queue twice", async () => {
      mockSessionRepository.count.mockResolvedValue(1);

      await expect(service.hasOngoingSession(1)).resolves.toBe(true);
    });

    it("reports no ongoing game when the player is free", async () => {
      mockSessionRepository.count.mockResolvedValue(0);

      await expect(service.hasOngoingSession(1)).resolves.toBe(false);
    });
  });

  describe("assertCanQueue & findSessionById & cancelOrphanSession & getLobby", () => {
    it("should assert user can queue when profile and deck exist", async () => {
      mockPlayerRepository.findOne.mockResolvedValue({ id: 1, user: { id: 1 } });
      mockDeckRepository.findOne.mockResolvedValue({ id: 10, user: { id: 1 }, cards: [] });
      mockSavedDeckRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ deckId: 10 }]),
      });
      mockOnlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({ eligible: true, issues: [] });

      await expect(service.assertCanQueue(1, 10)).resolves.toBeUndefined();
    });

    it("should find session by id", async () => {
      mockSessionRepository.findOne.mockResolvedValue(session);
      const result = await service.findSessionById(42);
      expect(result?.id).toBe(42);
    });

    it("should cancel orphan session", async () => {
      mockSessionRepository.update.mockResolvedValue({ affected: 1 });
      await service.cancelOrphanSession(42);
      expect(mockSessionRepository.update).toHaveBeenCalled();
    });

    it("should return lobby view for user", async () => {
      mockDeckRepository.find.mockResolvedValue([{ id: 10, name: "Deck A", cards: [] }]);
      mockSavedDeckRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ deckId: 10 }]),
      });
      mockOnlinePlaySupportService.evaluateDeckEligibility.mockReturnValue({ eligible: true, issues: [] });
      mockSessionRepository.find.mockResolvedValue([session]);

      const lobby = await service.getLobby(playerAUser);
      expect(lobby.activeSessions).toHaveLength(1);
      expect(lobby.availableDecks).toHaveLength(1);
    });

    it("should get session views by user", async () => {
      mockSessionRepository.findOne.mockResolvedValue(session);
      const views = await service.getSessionViewsByUser(42);
      expect(views.size).toBe(2);
      expect(views.get(playerAUser.id)).toBeDefined();
      expect(views.get(playerBUser.id)).toBeDefined();
    });
  });
});
