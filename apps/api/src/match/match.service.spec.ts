import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { DataSource } from "typeorm";
import { Deck } from "../deck/entities/deck.entity";
import { Player } from "../player/entities/player.entity";
import { Ranking } from "../ranking/entities/ranking.entity";
import { RankingService } from "../ranking/ranking.service";
import { Statistics } from "../statistics/entities/statistic.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "../tournament/entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../tournament/entities/tournament-registration.entity";
import { Match, MatchPhase, MatchStatus } from "./entities/match.entity";
import {
  OnlineMatchSession,
  OnlineMatchSessionStatus,
} from "./entities/online-match-session.entity";
import { MatchService } from "./match.service";

describe("MatchService", () => {
  let service: MatchService;

  const mockMatchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTournamentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockOnlineSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPlayerRepository = {
    findOne: jest.fn(),
  };

  const mockRegistrationRepository = {
    findOne: jest.fn(),
  };

  const mockRankingRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockStatisticsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDeckRepository = {
    findAndCount: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };
  const mockRankingService = {
    updateTournamentRankings: jest.fn(),
  };

  const mockUser: any = {
    id: 1,
    role: UserRole.USER,
  };

  const mockPlayerA: Player = {
    id: 1,
    xp: 0,
    level: 1,
    elo: 1000,
    user: mockUser,
    tournaments: [],
    statistics: [],
    rankings: [],
  };

  const mockPlayerB: Player = { ...mockPlayerA, id: 2 };

  const mockTournament: Tournament = {
    id: 1,
    name: "Tournament 1",
    status: TournamentStatus.IN_PROGRESS,
    type: TournamentType.SINGLE_ELIMINATION,
    currentRound: 1,
    matches: [],
    registrations: [],
    organizers: [],
    rankings: [],
    rewards: [],
    pricing: {} as any,
    startDate: new Date(),
    endDate: new Date(),
    location: "",
    description: "",
    rules: "",
    // Corrected property name
    maxPlayers: 16,
    additionalInfo: "",
    allowedFormats: [],
    ageRestrictionMin: 0,
    ageRestrictionMax: 0,
    requiresApproval: false,
    allowLateRegistration: true, // properties from entity
    isPublic: true,
    isExternal: false,
    isFinished: false,
    players: [], // Add missing property
    createdAt: new Date(),
    updatedAt: new Date(),
    notifications: [],
  };

  const mockMatch: Match = {
    id: 1,
    tournament: mockTournament,
    playerA: mockPlayerA,
    playerB: mockPlayerB,
    playerAScore: 0,
    playerBScore: 0,
    round: 1,
    phase: MatchPhase.QUALIFICATION,
    status: MatchStatus.SCHEDULED,
    scheduledDate: new Date(),
    startedAt: undefined,
    finishedAt: undefined,
    notes: "Match 1",
    statistics: [],
    onlineSession: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnlineSession: OnlineMatchSession = {
    id: 99,
    match: mockMatch,
    status: OnlineMatchSessionStatus.WAITING_FOR_DECKS,
    seed: "123456",
    playerADeckId: null,
    playerBDeckId: null,
    winnerPlayerId: null,
    endedReason: null,
    serializedState: null,
    eventLog: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: getRepositoryToken(Match), useValue: mockMatchRepository },
        {
          provide: getRepositoryToken(OnlineMatchSession),
          useValue: mockOnlineSessionRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepository,
        },
        { provide: getRepositoryToken(Player), useValue: mockPlayerRepository },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: mockRegistrationRepository,
        },
        {
          provide: getRepositoryToken(Ranking),
          useValue: mockRankingRepository,
        },
        {
          provide: getRepositoryToken(Statistics),
          useValue: mockStatisticsRepository,
        },
        { provide: getRepositoryToken(Deck), useValue: mockDeckRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: RankingService, useValue: mockRankingService },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn(), emitAsync: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const createDto = {
      tournamentId: 1,
      playerAId: 1,
      playerBId: 2,
      round: 1,
      phase: MatchPhase.QUALIFICATION,
      scheduledDate: new Date(),
      notes: "Test Match",
    };

    it("should create a match successfully", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne
        .mockResolvedValueOnce(mockPlayerA)
        .mockResolvedValueOnce(mockPlayerB);
      mockRegistrationRepository.findOne.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED,
      });
      mockMatchRepository.create.mockReturnValue(mockMatch);
      mockMatchRepository.save.mockResolvedValue(mockMatch);
      mockOnlineSessionRepository.findOne.mockResolvedValue(null);
      mockOnlineSessionRepository.create.mockReturnValue(mockOnlineSession);
      mockOnlineSessionRepository.save.mockResolvedValue(mockOnlineSession);

      const result = await service.create(createDto);

      expect(result.onlineSession).toEqual(mockOnlineSession);
      expect(mockMatchRepository.save).toHaveBeenCalled();
      expect(mockOnlineSessionRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if tournament not found", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException if tournament not in progress", async () => {
      mockTournamentRepository.findOne.mockResolvedValue({
        ...mockTournament,
        status: TournamentStatus.DRAFT,
      });
      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when player A is missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when player A is not registered", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne.mockResolvedValueOnce(mockPlayerA);
      mockRegistrationRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when player B is not registered", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne
        .mockResolvedValueOnce(mockPlayerA)
        .mockResolvedValueOnce(mockPlayerB);
      mockRegistrationRepository.findOne
        .mockResolvedValueOnce({ status: RegistrationStatus.CONFIRMED })
        .mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when players are missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne.mockResolvedValue(mockPlayerA);
      mockRegistrationRepository.findOne.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED,
      });

      await expect(
        service.create({
          ...createDto,
          playerBId: undefined as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when required fields are missing", async () => {
      mockTournamentRepository.findOne.mockResolvedValue(mockTournament);
      mockPlayerRepository.findOne
        .mockResolvedValueOnce(mockPlayerA)
        .mockResolvedValueOnce(mockPlayerB);
      mockRegistrationRepository.findOne.mockResolvedValue({
        status: RegistrationStatus.CONFIRMED,
      });

      await expect(
        service.create({
          ...createDto,
          notes: undefined as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("update", () => {
    it("should reject score updates outside the result pipeline", async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);

      await expect(
        service.update(1, {
          playerAScore: 2,
          playerBScore: 1,
        }),
      ).rejects.toThrow("flux de saisie de résultat");
      expect(mockMatchRepository.save).not.toHaveBeenCalled();
    });

    it("should reject direct transitions to in-progress", async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);

      await expect(
        service.update(1, { status: MatchStatus.IN_PROGRESS }),
      ).rejects.toThrow("action de démarrage");
      expect(mockMatchRepository.save).not.toHaveBeenCalled();
    });

    it("should update non-score fields when status is not finished", async () => {
      const scheduledDate = new Date();
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update(1, {
        status: MatchStatus.CANCELLED,
        notes: "Rescheduled",
        scheduledDate,
      });

      expect(result.status).toBe(MatchStatus.CANCELLED);
      expect(result.notes).toBe("Rescheduled");
      expect(result.scheduledDate).toBe(scheduledDate);
    });
  });

  describe("reportScore", () => {
    it("should process score reporting transactionally", async () => {
      const inProgressMatch = {
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS,
      };

      // Basic transaction mock that executes the callback
      mockDataSource.transaction.mockImplementation(
        async (cb: (manager: any) => Promise<unknown>) => {
          // Mock manager for transaction
          const manager = {
            save: jest
              .fn()
              .mockImplementation((entity, data) =>
                Promise.resolve(data || entity),
              ),
            findOne: jest.fn().mockImplementation(async (entity) => {
              return entity === Match ? inProgressMatch : mockTournament;
            }),
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockReturnValue({}),
          };
          return cb(manager);
        },
      );

      const reportDto = { playerAScore: 2, playerBScore: 0, isForfeit: false };
      await service.reportScore(1, reportDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it("should throw when match is not in progress", async () => {
      const scheduledMatch = {
        ...mockMatch,
        status: MatchStatus.SCHEDULED,
      };
      mockDataSource.transaction.mockImplementation((cb) =>
        cb({ findOne: jest.fn().mockResolvedValue(scheduledMatch) }),
      );

      await expect(
        service.reportScore(1, { playerAScore: 1, playerBScore: 0 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject a draw in an elimination match", async () => {
      const eliminationMatch = {
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS,
        tournament: {
          ...mockTournament,
          type: TournamentType.SINGLE_ELIMINATION,
        },
      };
      mockDataSource.transaction.mockImplementation((cb) =>
        cb({ findOne: jest.fn().mockResolvedValue(eliminationMatch) }),
      );

      await expect(
        service.reportScore(1, {
          playerAScore: 1,
          playerBScore: 1,
          isForfeit: false,
        }),
      ).rejects.toThrow("doit désigner un vainqueur");
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it("should handle forfeit logic and set winner", async () => {
      const forfeitMatch = { ...mockMatch, status: MatchStatus.IN_PROGRESS };
      mockMatchRepository.findOne.mockResolvedValue(forfeitMatch);

      const manager = {
        save: jest.fn().mockImplementation(() => Promise.resolve(forfeitMatch)),
        findOne: jest.fn().mockResolvedValue(forfeitMatch),
        create: jest.fn(),
      };

      mockDataSource.transaction.mockImplementation((cb) => cb(manager));
      const updateRankingsSpy = jest
        .spyOn<any, any>(service as any, "updateRankings")
        .mockResolvedValue(undefined);
      const createStatsSpy = jest
        .spyOn<any, any>(service as any, "createMatchStatistics")
        .mockResolvedValue(undefined);
      const checkProgressSpy = jest
        .spyOn<any, any>(service as any, "checkTournamentProgression")
        .mockResolvedValue(undefined);

      const result = await service.reportScore(1, {
        playerAScore: 0,
        playerBScore: 2,
        isForfeit: true,
        notes: "Forfeit",
      });

      expect(result.status).toBe(MatchStatus.FORFEIT);
      expect(result.winner).toEqual(mockPlayerB);
      expect(updateRankingsSpy).toHaveBeenCalled();
      expect(createStatsSpy).toHaveBeenCalled();
      expect(checkProgressSpy).toHaveBeenCalled();
    });

    it("should set winner based on higher score", async () => {
      const finishedMatch = { ...mockMatch, status: MatchStatus.IN_PROGRESS };
      mockMatchRepository.findOne.mockResolvedValue(finishedMatch);

      const manager = {
        save: jest
          .fn()
          .mockImplementation(() => Promise.resolve(finishedMatch)),
        findOne: jest.fn().mockResolvedValue(finishedMatch),
        create: jest.fn(),
      };

      mockDataSource.transaction.mockImplementation((cb) => cb(manager));
      jest
        .spyOn<any, any>(service as any, "updateRankings")
        .mockResolvedValue(undefined);
      jest
        .spyOn<any, any>(service as any, "createMatchStatistics")
        .mockResolvedValue(undefined);
      jest
        .spyOn<any, any>(service as any, "checkTournamentProgression")
        .mockResolvedValue(undefined);

      const result = await service.reportScore(1, {
        playerAScore: 1,
        playerBScore: 3,
        isForfeit: false,
        notes: "Played",
      });

      expect(result.status).toBe(MatchStatus.FINISHED);
      expect(result.winner).toEqual(mockPlayerB);
      expect(result.notes).toBe("Played");
    });

    it("should recalculate final rankings when the final closes the tournament", async () => {
      const finalMatch = {
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS,
        tournament: {
          ...mockTournament,
          type: TournamentType.SINGLE_ELIMINATION,
        },
      };
      const manager = {
        findOne: jest.fn().mockResolvedValue(finalMatch),
        save: jest
          .fn()
          .mockImplementation((_entity, data) => Promise.resolve(data)),
      };
      mockDataSource.transaction.mockImplementation((cb) => cb(manager));
      jest
        .spyOn<any, any>(service as any, "updateRankings")
        .mockResolvedValue(undefined);
      jest
        .spyOn<any, any>(service as any, "createMatchStatistics")
        .mockResolvedValue(undefined);
      jest
        .spyOn<any, any>(service as any, "checkTournamentProgression")
        .mockResolvedValue(true);
      mockRankingService.updateTournamentRankings.mockResolvedValue([
        { player: mockPlayerA, rank: 1 },
        { player: mockPlayerB, rank: 2 },
      ]);
      mockTournamentRepository.findOne.mockResolvedValue({
        ...mockTournament,
        registrations: [{ player: mockPlayerA }, { player: mockPlayerB }],
      });

      await service.reportScore(1, {
        playerAScore: 2,
        playerBScore: 0,
      });

      expect(mockRankingService.updateTournamentRankings).toHaveBeenCalledWith(
        mockTournament.id,
      );
    });
  });

  describe("findAll", () => {
    it("should return matches with pagination and filters", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockMatch], 1]),
      };

      mockMatchRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        tournamentId: 1,
      });

      expect(result.matches).toEqual([mockMatch]);
      expect(result.total).toBe(1);
      expect(mockMatchRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should apply every provided filter", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockMatchRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({
        page: 2,
        limit: 5,
        tournamentId: 1,
        round: 2,
        phase: MatchPhase.SEMI_FINAL,
        status: MatchStatus.FINISHED,
        playerId: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(5);
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  describe("getPlayHub", () => {
    it("should auto-create missing online sessions for player matches", async () => {
      const playHubQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ ...mockMatch, onlineSession: null }]),
      };

      mockPlayerRepository.findOne.mockResolvedValue(mockPlayerA);
      mockDeckRepository.findAndCount.mockResolvedValue([[], 0]);
      mockMatchRepository.createQueryBuilder.mockReturnValue(
        playHubQueryBuilder,
      );
      mockOnlineSessionRepository.findOne.mockResolvedValue(null);
      mockOnlineSessionRepository.create.mockReturnValue(mockOnlineSession);
      mockOnlineSessionRepository.save.mockResolvedValue(mockOnlineSession);

      const result = await service.getPlayHub(mockUser.id);

      expect(result.playerId).toBe(mockPlayerA.id);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].onlineSessionStatus).toBe(
        OnlineMatchSessionStatus.WAITING_FOR_DECKS,
      );
      expect(mockOnlineSessionRepository.save).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a match by id", async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);

      const result = await service.findOne(1);
      expect(result).toEqual(mockMatch);
    });

    it("should throw NotFoundException if match not found", async () => {
      mockMatchRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a scheduled match", async () => {
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockMatchRepository.remove.mockResolvedValue(mockMatch);

      await service.remove(1);
      expect(mockMatchRepository.remove).toHaveBeenCalledWith(mockMatch);
    });

    it("should throw BadRequestException if match is in progress", async () => {
      mockMatchRepository.findOne.mockResolvedValue({
        ...mockMatch,
        status: MatchStatus.IN_PROGRESS,
      });

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe("startMatch", () => {
    it("should delegate a single match to the transactional startup pipeline", async () => {
      const scheduledMatch = {
        ...mockMatch,
        status: MatchStatus.SCHEDULED,
      } as Match;
      jest.spyOn(service, "findOne").mockResolvedValue(scheduledMatch);
      const startMatchesSpy = jest
        .spyOn(service, "startMatches")
        .mockResolvedValue({
          startedCount: 1,
          matches: [{ ...scheduledMatch, status: MatchStatus.IN_PROGRESS }],
        });

      const result = await service.startMatch(1, { notes: "Starting" });

      expect(result.status).toBe(MatchStatus.IN_PROGRESS);
      expect(startMatchesSpy).toHaveBeenCalledWith(mockTournament.id, [1], {
        notes: "Starting",
      });
    });

    it("should start several current-round matches atomically", async () => {
      const matches = [
        { ...mockMatch, id: 1, status: MatchStatus.SCHEDULED },
        { ...mockMatch, id: 2, status: MatchStatus.SCHEDULED },
      ];
      const manager = {
        findOne: jest.fn().mockResolvedValue({
          ...mockTournament,
          status: TournamentStatus.IN_PROGRESS,
          currentRound: 1,
        }),
        find: jest.fn().mockResolvedValue(matches),
        save: jest
          .fn()
          .mockImplementation((_entity: unknown, values: Match[]) => values),
      };
      mockDataSource.transaction.mockImplementation(async (callback: any) =>
        callback(manager),
      );
      jest
        .spyOn<any, any>(service as any, "createOnlineSessionWithManager")
        .mockResolvedValue(undefined);

      const result = await service.startMatches(1, [1, 2]);

      expect(result.startedCount).toBe(2);
      expect(result.matches.every((match) => match.startedAt)).toBe(true);
      expect(manager.save).toHaveBeenCalledTimes(1);
      const eventEmitter = (service as any).eventEmitter;
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it("should reject startup outside an active tournament", async () => {
      mockDataSource.transaction.mockImplementation(async (callback: any) =>
        callback({
          findOne: jest.fn().mockResolvedValue({
            ...mockTournament,
            status: TournamentStatus.REGISTRATION_CLOSED,
          }),
        }),
      );

      await expect(service.startMatches(1, [1])).rejects.toThrow(
        "tournoi en cours",
      );
    });

    it("should reject a match from another round or without both players", async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue({
          ...mockTournament,
          status: TournamentStatus.IN_PROGRESS,
          currentRound: 2,
        }),
        find: jest.fn().mockResolvedValue([
          {
            ...mockMatch,
            round: 1,
            status: MatchStatus.SCHEDULED,
          },
        ]),
      };
      mockDataSource.transaction.mockImplementation(async (callback: any) =>
        callback(manager),
      );

      await expect(service.startMatches(1, [1])).rejects.toThrow(
        "round courant",
      );
    });

    it("should reject duplicate match identifiers", async () => {
      await expect(service.startMatches(1, [1, 1])).rejects.toThrow(
        "identifiants uniques",
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe("resetMatch", () => {
    it("should reset a finished match transactionally", async () => {
      const finishedMatch = {
        ...mockMatch,
        tournament: {
          ...mockTournament,
          status: TournamentStatus.IN_PROGRESS,
          currentRound: 1,
        },
        status: MatchStatus.FINISHED,
      };

      mockDataSource.transaction.mockImplementation(
        async (cb: (manager: any) => Promise<unknown>) => {
          const manager = {
            findOne: jest
              .fn()
              .mockResolvedValueOnce({ id: finishedMatch.id })
              .mockResolvedValueOnce(finishedMatch),
            save: jest
              .fn()
              .mockImplementation((entity, data) =>
                Promise.resolve(data || entity),
              ),
            delete: jest.fn().mockResolvedValue({}),
          };
          return cb(manager);
        },
      );
      mockRankingService.updateTournamentRankings.mockResolvedValue([]);

      const result = await service.resetMatch(1, { reason: "Mistake" });

      expect(result.status).toBe(MatchStatus.SCHEDULED);
      expect(result.notes).toBe("Réinitialisé: Mistake");
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockRankingService.updateTournamentRankings).toHaveBeenCalledWith(
        mockTournament.id,
      );
    });

    it("should throw BadRequestException if match is not finished", async () => {
      const scheduledMatch = {
        ...mockMatch,
        status: MatchStatus.SCHEDULED,
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ id: scheduledMatch.id })
            .mockResolvedValueOnce(scheduledMatch),
        }),
      );

      await expect(service.resetMatch(1, { reason: "Erreur" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject a reset after the tournament progressed", async () => {
      const previousRoundMatch = {
        ...mockMatch,
        tournament: {
          ...mockTournament,
          status: TournamentStatus.IN_PROGRESS,
          currentRound: 2,
        },
        round: 1,
        status: MatchStatus.FINISHED,
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ id: previousRoundMatch.id })
            .mockResolvedValueOnce(previousRoundMatch),
        }),
      );

      await expect(service.resetMatch(1, { reason: "Erreur" })).rejects.toThrow(
        "round suivant",
      );
      expect(
        mockRankingService.updateTournamentRankings,
      ).not.toHaveBeenCalled();
    });

    it("should reject a reset after tournament completion", async () => {
      const finalMatch = {
        ...mockMatch,
        tournament: {
          ...mockTournament,
          status: TournamentStatus.FINISHED,
          currentRound: 1,
        },
        status: MatchStatus.FINISHED,
      };
      mockDataSource.transaction.mockImplementation(async (cb: any) =>
        cb({
          findOne: jest
            .fn()
            .mockResolvedValueOnce({ id: finalMatch.id })
            .mockResolvedValueOnce(finalMatch),
        }),
      );

      await expect(service.resetMatch(1, { reason: "Erreur" })).rejects.toThrow(
        "fin",
      );
    });
  });

  describe("getMatchesByRound and getPlayerMatches", () => {
    it("should retrieve matches by round", async () => {
      mockMatchRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.getMatchesByRound(1, 2);

      expect(result).toEqual([mockMatch]);
      expect(mockMatchRepository.find).toHaveBeenCalledWith({
        where: { tournament: { id: 1 }, round: 2 },
        relations: ["playerA", "playerB", "winner"],
        order: { phase: "ASC" },
      });
    });

    it("should retrieve matches for a player in tournament", async () => {
      mockMatchRepository.find.mockResolvedValue([mockMatch]);

      const result = await service.getPlayerMatches(3, 4);

      expect(result).toEqual([mockMatch]);
      expect(mockMatchRepository.find).toHaveBeenCalledWith({
        where: [
          { tournament: { id: 3 }, playerA: { id: 4 } },
          { tournament: { id: 3 }, playerB: { id: 4 } },
        ],
        relations: ["playerA", "playerB", "winner"],
        order: { round: "ASC", phase: "ASC" },
      });
    });
  });

  describe("private helpers", () => {
    it("should update rankings when none exist", async () => {
      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockImplementation((_entity, data) => ({
          ...data,
          wins: data.wins ?? 0,
        })),
        save: jest.fn().mockResolvedValue(undefined),
      };

      await (service as any).updateRankings(
        { ...mockMatch, winner: mockPlayerA },
        manager,
      );

      expect(manager.create).toHaveBeenCalledTimes(2);
      expect(manager.save).toHaveBeenCalled();
    });

    it("should update existing rankings", async () => {
      const winnerRanking = {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        player: { id: mockPlayerA.id },
        tournament: { id: mockTournament.id },
      };
      const loserRanking = {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        player: { id: mockPlayerB.id },
        tournament: { id: mockTournament.id },
      };

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(winnerRanking)
          .mockResolvedValueOnce(loserRanking),
        save: jest.fn().mockResolvedValue(undefined),
      };

      await (service as any).updateRankings(
        { ...mockMatch, winner: mockPlayerA },
        manager,
      );

      expect(winnerRanking.wins).toBe(1);
      expect(winnerRanking.points).toBe(3);
      expect(loserRanking.losses).toBe(1);
      expect(manager.save).toHaveBeenCalledWith([winnerRanking, loserRanking]);
    });

    it("should create statistics for both players", async () => {
      const manager = {
        create: jest.fn().mockImplementation((_entity, data) => data),
        save: jest.fn().mockResolvedValue(undefined),
      };

      await (service as any).createMatchStatistics(
        { ...mockMatch, winner: mockPlayerA, playerAScore: 3, playerBScore: 1 },
        manager,
      );

      expect(manager.create).toHaveBeenCalledTimes(2);
      expect(manager.save).toHaveBeenCalledTimes(2);
    });

    it("should advance tournament when round finished", async () => {
      const finishedMatch: Match = {
        ...mockMatch,
        status: MatchStatus.FINISHED,
        tournament: {
          ...mockTournament,
          currentRound: 1,
          totalRounds: 2,
          type: TournamentType.SINGLE_ELIMINATION,
          matches: [
            { ...mockMatch, winner: mockPlayerA, status: MatchStatus.FINISHED },
            {
              ...mockMatch,
              id: 2,
              winner: mockPlayerB,
              status: MatchStatus.FINISHED,
            },
          ],
        },
      };

      const manager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((_entity, data) => data),
        find: jest.fn().mockResolvedValue(finishedMatch.tournament.matches),
        findOne: jest.fn().mockImplementation(async (entity) => {
          if (entity === Tournament) {
            return finishedMatch.tournament;
          }
          if (entity === TournamentRegistration) {
            return { eliminatedAt: null, eliminatedRound: null };
          }
          if (entity === OnlineMatchSession) {
            return null;
          }
          return null;
        }),
        save: jest
          .fn()
          .mockImplementation(async (_entity, data) => data ?? _entity),
      };

      await (service as any).checkTournamentProgression(finishedMatch, manager);

      expect(manager.create).toHaveBeenCalledWith(
        Match,
        expect.objectContaining({ round: 2 }),
      );
      expect(finishedMatch.tournament.currentRound).toBe(2);
      expect(manager.save).toHaveBeenCalledWith(finishedMatch.tournament);
    });

    it("should calculate phases for rounds", () => {
      expect((service as any).getPhaseForRound(3, 3)).toBe(MatchPhase.FINAL);
      expect((service as any).getPhaseForRound(2, 3)).toBe(
        MatchPhase.SEMI_FINAL,
      );
      expect((service as any).getPhaseForRound(1, 3)).toBe(
        MatchPhase.QUARTER_FINAL,
      );
      expect((service as any).getPhaseForRound(1, 5)).toBe(
        MatchPhase.QUALIFICATION,
      );
    });

    it("should finish an elimination tournament after the final", async () => {
      const tournament = {
        ...mockTournament,
        currentRound: 1,
        totalRounds: 1,
        status: TournamentStatus.IN_PROGRESS,
      };
      const finalMatch = {
        ...mockMatch,
        id: 7,
        round: 1,
        playerA: mockPlayerA,
        playerB: mockPlayerB,
        winner: mockPlayerA,
        status: MatchStatus.FINISHED,
      };
      const loserRegistration = {
        eliminatedAt: null,
        eliminatedRound: null,
      };
      const manager = {
        findOne: jest.fn().mockImplementation(async (entity) => {
          if (entity === TournamentRegistration) {
            return loserRegistration;
          }
          return null;
        }),
        save: jest.fn().mockImplementation(async (value) => value),
      };

      await (service as any).propagateEliminationWinners(
        tournament,
        [finalMatch],
        manager,
      );

      expect(loserRegistration.eliminatedAt).toBeInstanceOf(Date);
      expect(loserRegistration.eliminatedRound).toBe(1);
      expect(tournament.status).toBe(TournamentStatus.FINISHED);
      expect(tournament.isFinished).toBe(true);
    });
  });
});
