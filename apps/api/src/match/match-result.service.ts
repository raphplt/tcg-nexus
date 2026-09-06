import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        "tournament",
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
      ],
    });

    if (!match) {
      throw new NotFoundException({
        code: "MATCH_NOT_FOUND",
        message: "Match non trouvé",
      });
    }

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

    const existingPending = await this.proposalRepository.findOne({
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
      await this.proposalRepository.save(existingPending);
    }

    const proposerPlayer = isPlayerA ? match.playerA : match.playerB;

    const proposal = this.proposalRepository.create({
      match,
      proposerPlayer: proposerPlayer ?? undefined,
      proposerUser: { id: userId } as User,
      playerAScore: dto.playerAScore,
      playerBScore: dto.playerBScore,
      status: ProposalStatus.PENDING_CONFIRMATION,
      opponentResponse: OpponentResponse.PENDING,
      disputeReason: dto.notes,
    });

    await this.proposalRepository.save(proposal);

    match.resultStatus = MatchResultStatus.PROPOSED;
    await this.matchRepository.save(match);

    return proposal;
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
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        "tournament",
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
      ],
    });

    if (!match) {
      throw new NotFoundException({
        code: "MATCH_NOT_FOUND",
        message: "Match non trouvé",
      });
    }

    const isPlayerA = match.playerA?.user?.id === userId;
    const isPlayerB = match.playerB?.user?.id === userId;

    if (!isPlayerA && !isPlayerB) {
      throw new ForbiddenException(
        "Seuls les participants au match peuvent répondre à cette proposition.",
      );
    }

    const proposal = await this.proposalRepository.findOne({
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
      await this.proposalRepository.save(proposal);

      match.resultStatus = MatchResultStatus.CONFIRMED;
      match.confirmedAt = new Date();
      await this.matchRepository.save(match);

      // Report official score to advance tournament state
      const updatedMatch = await this.matchService.reportScore(match.id, {
        playerAScore: proposal.playerAScore,
        playerBScore: proposal.playerBScore,
        notes: `Score confirmé mutuellement (Proposition #${proposal.id})`,
      });

      return { proposal, match: updatedMatch };
    }

    // Opponent disputed
    proposal.status = ProposalStatus.DISPUTED;
    proposal.opponentResponse = OpponentResponse.REJECTED;
    proposal.disputeReason =
      dto.disputeReason || "Score contesté par l'adversaire.";
    await this.proposalRepository.save(proposal);

    match.resultStatus = MatchResultStatus.DISPUTED;
    match.disputedAt = new Date();
    await this.matchRepository.save(match);

    return { proposal, match };
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
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        "tournament",
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
      ],
    });

    if (!match) {
      throw new NotFoundException({
        code: "MATCH_NOT_FOUND",
        message: "Match non trouvé",
      });
    }

    const isOrganizer = await this.organizerRepository.findOne({
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

    let proposal = await this.proposalRepository.findOne({
      where: { match: { id: matchId } },
      order: { createdAt: "DESC" },
    });

    if (proposal) {
      proposal.status = ProposalStatus.RESOLVED_BY_ORGANIZER;
      proposal.organizerResolutionReason = dto.reason;
      proposal.resolvedByUser = user;
      await this.proposalRepository.save(proposal);
    }

    match.resultStatus = MatchResultStatus.CONFIRMED;
    await this.matchRepository.save(match);

    const updatedMatch = await this.matchService.reportScore(match.id, {
      playerAScore: dto.playerAScore,
      playerBScore: dto.playerBScore,
      notes: `[Arbitrage]: ${dto.reason}`,
    });

    await this.auditService.record({
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
    });

    return { proposal, match: updatedMatch };
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
