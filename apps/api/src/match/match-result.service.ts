import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import {
  MatchResultStatus,
  OpponentResponse,
  ProposalStatus,
} from "../common/enums/match-result-status";
import { UserRole } from "../common/enums/user";
import { Player } from "../player/entities/player.entity";
import { TournamentOrganizer } from "../tournament/entities/tournament-organizer.entity";
import { User } from "../user/entities/user.entity";
import {
  ProposeMatchResultDto,
  ResolveMatchDisputeDto,
  RespondMatchResultDto,
} from "./dto/match-result-proposal.dto";
import { MatchResultProposal } from "./entities/match-result-proposal.entity";
import { Match, MatchStatus } from "./entities/match.entity";
import { MatchService } from "./match.service";

/**
 * Service orchestrating match result proposals, opponent dispute workflows,
 * and organizer overrides (TRN-01).
 */
@Injectable()
export class MatchResultService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchResultProposal)
    private readonly proposalRepository: Repository<MatchResultProposal>,
    @InjectRepository(TournamentOrganizer)
    private readonly organizerRepository: Repository<TournamentOrganizer>,
    private readonly matchService: MatchService,
    private readonly auditService: AuditService,
    private readonly database: DataSource,
  ) {}

  /**
   * Submits a match result proposal on behalf of a participant.
   *
   * @param matchId - Target match ID.
   * @param userId - ID of authenticated user proposing the score.
   * @param dto - Propose score payload.
   * @returns Saved proposal.
   */
  async proposeResult(
    matchId: number,
    userId: number,
    dto: ProposeMatchResultDto,
  ): Promise<MatchResultProposal> {
    // Concurrent proposals on one match are serialized by its row lock, so two
    // players cannot both leave a pending proposal behind.
    return this.database.transaction(async (manager) => {
      const locked = await manager.findOne(Match, {
        where: { id: matchId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      const match = await manager.findOneOrFail(Match, {
        where: { id: matchId },
        relations: [
          "tournament",
          "playerA",
          "playerA.user",
          "playerB",
          "playerB.user",
        ],
      });

      if (
        match.status === MatchStatus.FINISHED ||
        match.status === MatchStatus.FORFEIT ||
        match.status === MatchStatus.CANCELLED
      ) {
        throw new BadRequestException("Ce match est déjà finalisé ou clôturé.");
      }

      const isPlayerA = match.playerA?.user?.id === userId;
      const isPlayerB = match.playerB?.user?.id === userId;

      if (!isPlayerA && !isPlayerB) {
        throw new ForbiddenException(
          "Seuls les participants au match peuvent soumettre une proposition de score.",
        );
      }

      const existingPending = await manager.findOne(MatchResultProposal, {
        where: {
          match: { id: matchId },
          status: ProposalStatus.PENDING_CONFIRMATION,
        },
        relations: ["proposerUser"],
        order: { createdAt: "DESC" },
      });

      if (existingPending) {
        if (existingPending.proposerUser?.id !== userId) {
          throw new BadRequestException(
            "Votre adversaire a déjà soumis une proposition. Veuillez la valider ou la contester.",
          );
        }
        // Re-proposal from same user supersedes prior pending proposal
        existingPending.status = ProposalStatus.SUPERSEDED;
        await manager.save(MatchResultProposal, existingPending);
      }

      const proposerPlayer = isPlayerA ? match.playerA : match.playerB;

      const proposal = await manager.save(
        MatchResultProposal,
        manager.create(MatchResultProposal, {
          match,
          proposerPlayer: proposerPlayer ?? undefined,
          proposerUser: { id: userId } as User,
          playerAScore: dto.playerAScore,
          playerBScore: dto.playerBScore,
          status: ProposalStatus.PENDING_CONFIRMATION,
          opponentResponse: OpponentResponse.PENDING,
          disputeReason: dto.notes,
        }),
      );

      match.resultStatus = MatchResultStatus.PROPOSED;
      await manager.save(Match, match);

      return proposal;
    });
  }

  /**
   * Responds to a pending match result proposal (Accept or Dispute).
   *
   * @param matchId - Target match ID.
   * @param userId - ID of responding user (must be opponent).
   * @param dto - Response payload (ACCEPT | DISPUTE).
   */
  async respondResult(
    matchId: number,
    userId: number,
    dto: RespondMatchResultDto,
  ): Promise<{ proposal: MatchResultProposal; match: Match }> {
    // The confirmation and the official result commit together: a score the
    // tournament rejects leaves no confirmed proposal behind.
    const outcome = await this.database.transaction(async (manager) => {
      const locked = await manager.findOne(Match, {
        where: { id: matchId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      const match = await manager.findOneOrFail(Match, {
        where: { id: matchId },
        relations: [
          "tournament",
          "playerA",
          "playerA.user",
          "playerB",
          "playerB.user",
        ],
      });

      const isPlayerA = match.playerA?.user?.id === userId;
      const isPlayerB = match.playerB?.user?.id === userId;

      if (!isPlayerA && !isPlayerB) {
        throw new ForbiddenException(
          "Seuls les participants au match peuvent répondre à cette proposition.",
        );
      }

      const proposal = await manager.findOne(MatchResultProposal, {
        where: {
          match: { id: matchId },
          status: ProposalStatus.PENDING_CONFIRMATION,
        },
        relations: ["proposerUser"],
        order: { createdAt: "DESC" },
      });

      if (!proposal) {
        throw new NotFoundException(
          "Aucune proposition en attente pour ce match.",
        );
      }

      if (proposal.proposerUser?.id === userId) {
        throw new BadRequestException(
          "Vous ne pouvez pas valider votre propre proposition.",
        );
      }

      if (dto.accept) {
        proposal.status = ProposalStatus.CONFIRMED;
        proposal.opponentResponse = OpponentResponse.ACCEPTED;
        await manager.save(MatchResultProposal, proposal);

        match.resultStatus = MatchResultStatus.CONFIRMED;
        match.confirmedAt = new Date();
        await manager.save(Match, match);

        // Report official score to advance tournament state
        const updatedMatch = await this.matchService.reportScore(
          match.id,
          {
            playerAScore: proposal.playerAScore,
            playerBScore: proposal.playerBScore,
            notes: `Score confirmé mutuellement (Proposition #${proposal.id})`,
          },
          manager,
        );

        return {
          proposal,
          match: updatedMatch,
          tournamentId: match.tournament?.id ?? null,
        };
      }

      // Opponent disputed
      proposal.status = ProposalStatus.DISPUTED;
      proposal.opponentResponse = OpponentResponse.REJECTED;
      proposal.disputeReason =
        dto.disputeReason || "Score contesté par l'adversaire.";
      await manager.save(MatchResultProposal, proposal);

      match.resultStatus = MatchResultStatus.DISPUTED;
      match.disputedAt = new Date();
      await manager.save(Match, match);

      return { proposal, match, tournamentId: null as number | null };
    });

    // Standings and notifications open their own connections, so they run once
    // the confirmation has committed rather than inside its locks.
    if (outcome.tournamentId) {
      await this.matchService.applyPostScoreEffects(outcome.tournamentId);
    }
    return { proposal: outcome.proposal, match: outcome.match };
  }

  /**
   * Resolves a disputed match result as an organizer or admin.
   *
   * @param matchId - Target match ID.
   * @param user - Acting organizer or administrator.
   * @param dto - Resolved scores and justification.
   */
  async resolveDispute(
    matchId: number,
    user: User,
    dto: ResolveMatchDisputeDto,
  ): Promise<{ proposal: MatchResultProposal | null; match: Match }> {
    const outcome = await this.database.transaction(async (manager) => {
      const locked = await manager.findOne(Match, {
        where: { id: matchId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) {
        throw new NotFoundException({
          code: "MATCH_NOT_FOUND",
          message: "Match non trouvé",
        });
      }

      const match = await manager.findOneOrFail(Match, {
        where: { id: matchId },
        relations: [
          "tournament",
          "playerA",
          "playerA.user",
          "playerB",
          "playerB.user",
        ],
      });

      const isOrganizer = await manager.findOne(TournamentOrganizer, {
        where: {
          tournament: { id: match.tournament.id },
          user: { id: user.id },
          isActive: true,
        },
      });

      if (user.role !== UserRole.ADMIN && !isOrganizer) {
        throw new ForbiddenException(
          "Seul un organisateur actif ou un administrateur peut trancher ce litige.",
        );
      }

      const proposal = await manager.findOne(MatchResultProposal, {
        where: { match: { id: matchId } },
        order: { createdAt: "DESC" },
      });

      if (proposal) {
        proposal.status = ProposalStatus.RESOLVED_BY_ORGANIZER;
        proposal.organizerResolutionReason = dto.reason;
        proposal.resolvedByUser = user;
        await manager.save(MatchResultProposal, proposal);
      }

      match.resultStatus = MatchResultStatus.CONFIRMED;
      await manager.save(Match, match);

      const updatedMatch = await this.matchService.reportScore(
        match.id,
        {
          playerAScore: dto.playerAScore,
          playerBScore: dto.playerBScore,
          notes: `[Arbitrage]: ${dto.reason}`,
        },
        manager,
      );

      await this.auditService.record(
        {
          actorId: user.id,
          actorRole: user.role,
          targetType: "MATCH",
          targetId: String(match.id),
          action: "RESOLVE_MATCH_DISPUTE",
          reason: dto.reason,
          afterState: {
            playerAScore: dto.playerAScore,
            playerBScore: dto.playerBScore,
            resultStatus: MatchResultStatus.CONFIRMED,
          },
        },
        manager,
      );

      return {
        proposal,
        match: updatedMatch,
        tournamentId: match.tournament?.id ?? null,
      };
    });

    if (outcome.tournamentId) {
      await this.matchService.applyPostScoreEffects(outcome.tournamentId);
    }
    return { proposal: outcome.proposal, match: outcome.match };
  }

  /**
   * Retrieves proposal history for a match.
   *
   * @param matchId - Target match ID.
   */
  async getMatchProposals(matchId: number): Promise<MatchResultProposal[]> {
    return this.proposalRepository.find({
      where: { match: { id: matchId } },
      relations: ["proposerPlayer", "proposerUser", "resolvedByUser"],
      order: { createdAt: "DESC" },
    });
  }
}
