import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { CasualMatchService } from "./casual-match.service";
import { MatchmakingService } from "./matchmaking.service";

describe("MatchmakingService", () => {
  let service: MatchmakingService;

  const mockUserRepository = { findOne: jest.fn(), findOneOrFail: jest.fn() };
  const mockPlayerRepository = { findOne: jest.fn() };
  const mockCasualMatchService = {
    hasOngoingSession: jest.fn(),
    assertCanQueue: jest.fn(),
    createSession: jest.fn(),
    selectDeck: jest.fn(),
    cancelOrphanSession: jest.fn(),
    findSessionById: jest.fn(),
  };

  const buildUser = (id: number) =>
    ({
      id,
      email: `p${id}@test.com`,
      firstName: "P",
      lastName: `${id}`,
    }) as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepository },
        { provide: CasualMatchService, useValue: mockCasualMatchService },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);

    mockUserRepository.findOne.mockImplementation(({ where }) =>
      Promise.resolve(buildUser(where.id)),
    );
    mockUserRepository.findOneOrFail.mockImplementation(({ where }) =>
      Promise.resolve(buildUser(where.id)),
    );
    mockPlayerRepository.findOne.mockResolvedValue({ elo: 1000 });
    mockCasualMatchService.hasOngoingSession.mockResolvedValue(false);
    mockCasualMatchService.assertCanQueue.mockResolvedValue(undefined);
    mockCasualMatchService.createSession.mockResolvedValue({ id: 7 });
    mockCasualMatchService.selectDeck.mockResolvedValue(undefined);
    mockCasualMatchService.findSessionById.mockResolvedValue({ id: 7 });
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it("refuses to queue a player who already has a game running", async () => {
    mockCasualMatchService.hasOngoingSession.mockResolvedValue(true);

    await expect(service.joinQueue(1, 10)).rejects.toThrow(BadRequestException);
    expect(service.isQueued(1)).toBe(false);
  });

  it("refuses to queue an unknown user", async () => {
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(service.joinQueue(1, 10)).rejects.toThrow(NotFoundException);
  });

  it("validates the deck before adding the player to the queue", async () => {
    mockCasualMatchService.assertCanQueue.mockRejectedValue(
      new BadRequestException("Selected deck is not eligible for online play"),
    );

    await expect(service.joinQueue(1, 10)).rejects.toThrow(BadRequestException);
    expect(service.isQueued(1)).toBe(false);
    expect(service.getQueueSize()).toBe(0);
  });

  it("queues a lone player and pairs the second one", async () => {
    const solo = await service.joinQueue(1, 10);
    expect(solo).toBeNull();
    expect(service.isQueued(1)).toBe(true);

    const paired = await service.joinQueue(2, 20);

    expect(paired).toMatchObject({
      matched: true,
      playerAUserId: 2,
      playerBUserId: 1,
    });
    expect(service.getQueueSize()).toBe(0);
  });

  it("never pairs a ranked player with a casual one", async () => {
    await service.joinQueue(1, 10, true);
    const result = await service.joinQueue(2, 20, false);

    expect(result).toBeNull();
    expect(service.getQueueSize()).toBe(2);
  });

  it("cancels the orphan session and warns both players when pairing fails", async () => {
    const failures: Array<{ userIds: number[]; message: string }> = [];
    service.registerMatchFailedHandler((failure) => {
      failures.push(failure);
    });
    mockCasualMatchService.selectDeck.mockRejectedValue(
      new BadRequestException("Player profile is required"),
    );

    await service.joinQueue(1, 10);
    const result = await service.joinQueue(2, 20);

    expect(result).toBeNull();
    expect(mockCasualMatchService.cancelOrphanSession).toHaveBeenCalledWith(7);
    expect(failures).toEqual([
      { userIds: [2, 1], message: "Player profile is required" },
    ]);
    // Both players are released instead of being stuck in a broken pairing.
    expect(service.getQueueSize()).toBe(0);
  });
});
