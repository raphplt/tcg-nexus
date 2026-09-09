import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MatchResultProposal } from "./entities/match-result-proposal.entity";
import { MatchResultService } from "./match-result.service";
import {
  MatchResultStatus,
  OpponentResponse,
  ProposalStatus,
} from "../common/enums/match-result-status";
import { UserRole } from "../common/enums/user";
import { Match, MatchStatus } from "./entities/match.entity";

describe("MatchResultService", () => {
  let service: MatchResultService;
  let matchRepository: any;
  let proposalRepository: any;
  let organizerRepository: any;
  let matchService: any;
  let auditService: any;

  const mockUserA = { id: 10, role: UserRole.USER, email: "a@test.com" } as any;
  const mockUserB = { id: 20, role: UserRole.USER, email: "b@test.com" } as any;
  const mockPlayerA = { id: 1, user: mockUserA } as any;
  const mockPlayerB = { id: 2, user: mockUserB } as any;

  const mockMatch = {
    id: 100,
    tournament: { id: 5 },
    playerA: mockPlayerA,
    playerB: mockPlayerB,
    playerAScore: 0,
    playerBScore: 0,
    status: MatchStatus.IN_PROGRESS,
    resultStatus: MatchResultStatus.UNREPORTED,
  } as any;

  let manager: Record<string, jest.Mock>;

  beforeEach(() => {
    matchRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    proposalRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 55, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    organizerRepository = {
      findOne: jest.fn(),
    };
    matchService = {
      reportScore: jest
        .fn()
        .mockResolvedValue({ id: 100, status: MatchStatus.FINISHED }),
      applyPostScoreEffects: jest.fn().mockResolvedValue(undefined),
    };
    auditService = {
      record: jest.fn().mockResolvedValue({ id: 1 }),
    };

    // Proposals, confirmations and arbitrations run inside one transaction, so
    // the manager stands in for the repositories they write through.
    manager = {
      findOne: jest.fn(async (entity: unknown, options: unknown) =>
        entity === Match
          ? matchRepository.findOne(options)
          : entity === MatchResultProposal
            ? proposalRepository.findOne(options)
            : organizerRepository.findOne(options),
      ),
      findOneOrFail: jest.fn(async (entity: unknown, options: unknown) => {
        const found =
          entity === Match
            ? await matchRepository.findOne(options)
            : await proposalRepository.findOne(options);
        if (!found) throw new Error("Entity not found");
        return found;
      }),
      create: jest.fn((_entity: unknown, data: unknown) => ({
        id: 55,
        ...(data as Record<string, unknown>),
      })),
      save: jest.fn(async (_entity: unknown, data: unknown) => data),
    };

    service = new MatchResultService(
      matchRepository,
      proposalRepository,
      organizerRepository,
      matchService,
      auditService,
      { transaction: (work: (m: unknown) => Promise<unknown>) => work(manager) } as never,
    );
  });

  describe("proposeResult", () => {
    it("should allow a participant to propose a result", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });
      proposalRepository.findOne.mockResolvedValue(null);

      const result = await service.proposeResult(100, 10, {
        playerAScore: 2,
        playerBScore: 1,
        notes: "Gg",
      });

      expect(result.playerAScore).toBe(2);
      expect(result.playerBScore).toBe(1);
      expect(result.status).toBe(ProposalStatus.PENDING_CONFIRMATION);
      expect(manager.save).toHaveBeenCalledWith(
        Match,
        expect.objectContaining({ resultStatus: MatchResultStatus.PROPOSED }),
      );
    });

    it("should reject non-participant proposals", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });

      await expect(
        service.proposeResult(100, 999, { playerAScore: 2, playerBScore: 0 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("respondResult", () => {
    it("should accept proposal, set confirmed status and report score", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });
      proposalRepository.findOne.mockResolvedValue({
        id: 55,
        proposerUser: mockUserA,
        playerAScore: 2,
        playerBScore: 0,
        status: ProposalStatus.PENDING_CONFIRMATION,
      });

      const res = await service.respondResult(100, 20, { accept: true });

      expect(res.proposal.status).toBe(ProposalStatus.CONFIRMED);
      expect(res.proposal.opponentResponse).toBe(OpponentResponse.ACCEPTED);
      // The official score is reported inside the confirmation's transaction.
      expect(matchService.reportScore).toHaveBeenCalledWith(
        100,
        {
          playerAScore: 2,
          playerBScore: 0,
          notes: expect.stringContaining("Score confirmé mutuellement"),
        },
        manager,
      );
    });

    it("should reject validation by proposer themselves", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });
      proposalRepository.findOne.mockResolvedValue({
        id: 55,
        proposerUser: mockUserA,
        status: ProposalStatus.PENDING_CONFIRMATION,
      });

      await expect(
        service.respondResult(100, 10, { accept: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should dispute proposal and mark match as disputed", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });
      proposalRepository.findOne.mockResolvedValue({
        id: 55,
        proposerUser: mockUserA,
        status: ProposalStatus.PENDING_CONFIRMATION,
      });

      const res = await service.respondResult(100, 20, {
        accept: false,
        disputeReason: "Incorrect score",
      });

      expect(res.proposal.status).toBe(ProposalStatus.DISPUTED);
      expect(res.match.resultStatus).toBe(MatchResultStatus.DISPUTED);
    });
  });

  describe("resolveDispute", () => {
    it("should allow organizer to resolve a dispute with audit trail", async () => {
      matchRepository.findOne.mockResolvedValue({ ...mockMatch });
      organizerRepository.findOne.mockResolvedValue({ id: 1, isActive: true });
      proposalRepository.findOne.mockResolvedValue({ id: 55 });

      const adminUser = {
        id: 99,
        role: UserRole.ADMIN,
        email: "admin@test.com",
      } as any;

      const res = await service.resolveDispute(100, adminUser, {
        playerAScore: 2,
        playerBScore: 1,
        reason: "Judge verification of slip",
      });

      expect(matchService.reportScore).toHaveBeenCalledWith(
        100,
        {
          playerAScore: 2,
          playerBScore: 1,
          notes: expect.stringContaining("Arbitrage"),
        },
        manager,
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "RESOLVE_MATCH_DISPUTE",
          reason: "Judge verification of slip",
        }),
        manager,
      );
    });
  });
});
