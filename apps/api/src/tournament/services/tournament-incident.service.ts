import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import {
  MatchResultStatus,
  ProposalStatus,
} from "../../common/enums/match-result-status";
import { UserRole } from "../../common/enums/user";
import { MatchResultProposal } from "../../match/entities/match-result-proposal.entity";
import { Match, MatchStatus } from "../../match/entities/match.entity";
import { MatchService } from "../../match/match.service";
import { Player } from "../../player/entities/player.entity";
import { RankingService } from "../../ranking/ranking.service";
import { User } from "../../user/entities/user.entity";
import {
  ActiveMatchDto,
  DeckStatusDto,
  PlayerTournamentDashboardDto,
} from "../dto/player-tournament-dashboard.dto";
import {
  DropPlayerDto,
  ScoreCorrectionApplyDto,
  ScoreCorrectionPreviewDto,
} from "../dto/tournament-incident.dto";
import { TournamentDeckSnapshot } from "../entities/tournament-deck-snapshot.entity";
import { TournamentOrganizer } from "../entities/tournament-organizer.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { SwissPairingService, toSwissResults } from "./swiss-pairing.service";
import { TournamentRoundClockService } from "./tournament-round-clock.service";

/**
 * Service managing tournament incident responses: mid-tournament drops,
 * audited score corrections, and real-time player dashboards (TRN-05).
 */
@Injectable()
export class TournamentIncidentService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchResultProposal)
    private readonly proposalRepository: Repository<MatchResultProposal>,
    @InjectRepository(TournamentDeckSnapshot)
    private readonly snapshotRepository: Repository<TournamentDeckSnapshot>,
    @InjectRepository(TournamentOrganizer)
    private readonly organizerRepository: Repository<TournamentOrganizer>,
    private readonly matchService: MatchService,
    private readonly rankingService: RankingService,
    private readonly clockService: TournamentRoundClockService,
    private readonly swissPairingService: SwissPairingService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Drops a player from the tournament, forfeiting any active round match
   * and excluding them from future round pairings.
   */
  async dropPlayer(
    tournamentId: number,
    requestingUser: User,
    dto: DropPlayerDto,
  ): Promise<{ success: boolean; droppedPlayerId: number; message: string }> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    let targetPlayerId = dto.playerId;

    if (!targetPlayerId) {
      const myPlayer = await this.playerRepository.findOne({
        where: { user: { id: requestingUser.id } },
      });
      if (!myPlayer) {
        throw new NotFoundException("Joueur non trouvé pour votre compte.");
      }
      targetPlayerId = myPlayer.id;
    } else {
      const isSelf = await this.playerRepository.findOne({
        where: { id: targetPlayerId, user: { id: requestingUser.id } },
      });

      if (!isSelf && requestingUser.role !== UserRole.ADMIN) {
        const isOrganizer = await this.organizerRepository.findOne({
          where: {
            tournament: { id: tournamentId },
            user: { id: requestingUser.id },
            isActive: true,
          },
        });
        if (!isOrganizer) {
          throw new ForbiddenException(
            "Seul un organisateur ou le joueur lui-même peut déclarer un abandon.",
          );
        }
      }
    }

    const registration = await this.registrationRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: targetPlayerId },
      },
      relations: ["player"],
    });

    if (!registration) {
      throw new NotFoundException("Inscription introuvable pour ce joueur.");
    }

    if (registration.droppedAt) {
      throw new BadRequestException("Ce joueur a déjà abandonné le tournoi.");
    }

    const now = new Date();
    registration.droppedAt = now;
    registration.droppedRound = tournament.currentRound || 1;
    registration.status = RegistrationStatus.CANCELLED;
    if (dto.reason) {
      registration.notes = registration.notes
        ? `${registration.notes} | Abandon: ${dto.reason}`
        : `Abandon: ${dto.reason}`;
    }

    await this.registrationRepository.save(registration);

    // If active match in progress for this player in current round, forfeit it
    const activeMatch = await this.matchRepository.findOne({
      where: [
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerA: { id: targetPlayerId },
          status: MatchStatus.IN_PROGRESS,
        },
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerB: { id: targetPlayerId },
          status: MatchStatus.IN_PROGRESS,
        },
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerA: { id: targetPlayerId },
          status: MatchStatus.SCHEDULED,
        },
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerB: { id: targetPlayerId },
          status: MatchStatus.SCHEDULED,
        },
      ],
      relations: ["playerA", "playerB", "tournament"],
    });

    if (activeMatch) {
      const isPlayerA = activeMatch.playerA?.id === targetPlayerId;
      await this.matchService.reportScore(activeMatch.id, {
        playerAScore: isPlayerA ? 0 : 2,
        playerBScore: isPlayerA ? 2 : 0,
        isForfeit: true,
        notes: `Forfeit victory following player #${targetPlayerId} drop`,
      });
    }

    await this.auditService.record({
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      targetType: "TOURNAMENT",
      targetId: String(tournamentId),
      action: "DROP_PLAYER",
      reason: dto.reason,
      afterState: {
        droppedPlayerId: targetPlayerId,
        droppedRound: registration.droppedRound,
      },
    });

    return {
      success: true,
      droppedPlayerId: targetPlayerId,
      message: `Player #${targetPlayerId} has been dropped from future pairings.`,
    };
  }

  /**
   * Previews the standings delta if a match score were corrected.
   */
  async previewScoreCorrection(
    tournamentId: number,
    dto: ScoreCorrectionPreviewDto,
  ): Promise<{
    matchId: number;
    playerA: { id: number; name: string; oldScore: number; newScore: number };
    playerB: { id: number; name: string; oldScore: number; newScore: number };
    standingsDelta: Array<{
      playerId: number;
      playerName: string;
      oldRank: number;
      newRank: number;
      rankChange: number;
      oldPoints: number;
      newPoints: number;
    }>;
  }> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      relations: [
        "matches",
        "matches.playerA",
        "matches.playerA.user",
        "matches.playerB",
        "matches.playerB.user",
        "matches.winner",
      ],
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const targetMatch = tournament.matches?.find((m) => m.id === dto.matchId);
    if (!targetMatch) {
      throw new NotFoundException("Match introuvable dans ce tournoi.");
    }

    const currentRankings =
      await this.rankingService.getTournamentRankings(tournamentId);
    const oldRanksMap = new Map(currentRankings.map((r) => [r.player.id, r]));

    // Simulated matches with replaced score
    const simulatedMatches = (tournament.matches || []).map((m) => {
      if (m.id !== dto.matchId) return m;
      const winner =
        dto.playerAScore > dto.playerBScore
          ? m.playerA
          : dto.playerBScore > dto.playerAScore
            ? m.playerB
            : null;
      return {
        ...m,
        playerAScore: dto.playerAScore,
        playerBScore: dto.playerBScore,
        winner,
        status: MatchStatus.FINISHED,
      } as Match;
    });

    const playerIds = currentRankings.map((r) => r.player.id);
    const simulatedStandings = this.swissPairingService.computeStandings(
      playerIds,
      toSwissResults(simulatedMatches),
    );

    const standingsDelta = simulatedStandings.map((standing, index) => {
      const newRank = index + 1;
      const oldRanking = oldRanksMap.get(standing.playerId);
      const oldRank = oldRanking?.rank || newRank;
      const oldPoints = oldRanking?.points || 0;
      const playerName = this.getUserDisplayName(
        oldRanking?.player?.user,
        `Player #${standing.playerId}`,
      );

      return {
        playerId: standing.playerId,
        playerName,
        oldRank,
        newRank,
        rankChange: oldRank - newRank,
        oldPoints,
        newPoints: standing.points,
      };
    });

    return {
      matchId: dto.matchId,
      playerA: {
        id: targetMatch.playerA?.id,
        name: this.getUserDisplayName(
          targetMatch.playerA?.user,
          `Player #${targetMatch.playerA?.id}`,
        ),
        oldScore: targetMatch.playerAScore,
        newScore: dto.playerAScore,
      },
      playerB: {
        id: targetMatch.playerB?.id,
        name: this.getUserDisplayName(
          targetMatch.playerB?.user,
          `Player #${targetMatch.playerB?.id}`,
        ),
        oldScore: targetMatch.playerBScore,
        newScore: dto.playerBScore,
      },
      standingsDelta,
    };
  }

  /**
   * Applies an audited score correction and recalculates tournament standings.
   */
  async applyScoreCorrection(
    tournamentId: number,
    user: User,
    dto: ScoreCorrectionApplyDto,
  ): Promise<{
    match: Match;
    downstreamMatchIds: number[];
    message: string;
  }> {
    const isOrganizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        user: { id: user.id },
        isActive: true,
      },
    });

    if (user.role !== UserRole.ADMIN && !isOrganizer) {
      throw new ForbiddenException(
        "Seul un organisateur ou un administrateur peut appliquer une correction de score.",
      );
    }

    const match = await this.matchRepository.findOne({
      where: { id: dto.matchId, tournament: { id: tournamentId } },
      relations: ["playerA", "playerB", "winner", "tournament"],
    });

    if (!match) {
      throw new NotFoundException("Match introuvable dans ce tournoi.");
    }

    // Later matches already played were paired from the result being corrected;
    // this correction does not re-pair them, so an operator must acknowledge it.
    const downstream = await this.findDownstreamMatches(tournamentId, match);
    if (downstream.length && !dto.acknowledgeDownstreamImpact) {
      throw new ConflictException({
        code: "DOWNSTREAM_MATCHES_AFFECTED",
        message:
          "Des matches ultérieurs de ces joueurs sont déjà joués : confirmez la correction pour l'appliquer sans réapparier.",
        downstreamMatchIds: downstream.map((entry) => entry.id),
      });
    }

    const beforeState = {
      playerAScore: match.playerAScore,
      playerBScore: match.playerBScore,
      winnerId: match.winner?.id ?? null,
    };

    match.playerAScore = dto.playerAScore;
    match.playerBScore = dto.playerBScore;
    if (dto.playerAScore > dto.playerBScore) {
      match.winner = match.playerA;
    } else if (dto.playerBScore > dto.playerAScore) {
      match.winner = match.playerB;
    } else {
      match.winner = null as any;
    }
    match.status = MatchStatus.FINISHED;
    const actorName = this.getUserDisplayName(user, `User #${user.id}`);
    match.notes = `Correction administrative par ${actorName}: ${dto.reason}`;

    await this.matchRepository.save(match);

    // The rating this result already produced is reversed before the corrected
    // outcome is rated, so a correction cannot leave the old ELO applied.
    const reversedRatings = await this.rankingService.reverseMatchElo(
      match.id,
      `Score correction by ${actorName}`,
    );

    // Recalculate tournament rankings with updated score
    await this.rankingService.updateTournamentRankings(tournamentId);

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      targetType: "TOURNAMENT",
      targetId: String(tournamentId),
      action: "CORRECT_TOURNAMENT_SCORE",
      reason: dto.reason,
      beforeState: { matchId: dto.matchId, ...beforeState },
      afterState: {
        matchId: dto.matchId,
        playerAScore: dto.playerAScore,
        playerBScore: dto.playerBScore,
        winnerId: match.winner?.id ?? null,
        reversedRatings,
        downstreamMatchIds: downstream.map((entry) => entry.id),
        downstreamAcknowledged: !!dto.acknowledgeDownstreamImpact,
      },
    });

    return {
      match,
      downstreamMatchIds: downstream.map((entry) => entry.id),
      message: downstream.length
        ? "Score corrigé et classements recalculés ; les matches ultérieurs déjà joués n'ont pas été réappariés."
        : "Score corrigé et classements recalculés avec succès.",
    };
  }

  /**
   * Finds later matches of the same players that this correction cannot re-pair.
   *
   * @param tournamentId - Tournament the correction applies to.
   * @param match - Match whose result is being corrected.
   * @returns Matches in later rounds that are already played or running.
   */
  private async findDownstreamMatches(
    tournamentId: number,
    match: Match,
  ): Promise<Match[]> {
    const playerIds = [match.playerA?.id, match.playerB?.id].filter(
      (id): id is number => !!id,
    );
    if (!playerIds.length) return [];

    const later = await this.matchRepository.find({
      where: [
        {
          tournament: { id: tournamentId },
          round: MoreThan(match.round ?? 0),
          playerA: { id: In(playerIds) },
        },
        {
          tournament: { id: tournamentId },
          round: MoreThan(match.round ?? 0),
          playerB: { id: In(playerIds) },
        },
      ],
      relations: ["playerA", "playerB"],
    });

    return later.filter(
      (entry) =>
        entry.status === MatchStatus.FINISHED ||
        entry.status === MatchStatus.IN_PROGRESS ||
        entry.status === MatchStatus.FORFEIT,
    );
  }

  /**
   * Compiles live tournament cockpit dashboard for an active participant.
   */
  async getPlayerDashboard(
    tournamentId: number,
    userId: number,
  ): Promise<PlayerTournamentDashboardDto> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!player) {
      throw new NotFoundException("Profil joueur introuvable pour ce compte.");
    }

    const registration = await this.registrationRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: player.id },
      },
    });

    if (!registration) {
      throw new ForbiddenException("Vous n'êtes pas inscrit à ce tournoi.");
    }

    const clockStatus =
      await this.clockService.getRoundClockStatus(tournamentId);

    // Deck status
    const snapshot = await this.snapshotRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: player.id },
      },
      relations: ["deck"],
    });

    const deckStatus: DeckStatusDto = {
      isSubmitted: Boolean(snapshot),
      isLocked: Boolean(snapshot?.isLocked),
      isValid: Boolean(snapshot?.isValid),
      deckName: snapshot?.deckName,
      deckId: snapshot?.deck?.id,
      validationErrors: snapshot?.validationErrors,
    };

    // Active match for the current round
    const activeMatchEntity = await this.matchRepository.findOne({
      where: [
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerA: { id: player.id },
        },
        {
          tournament: { id: tournamentId },
          round: tournament.currentRound,
          playerB: { id: player.id },
        },
      ],
      relations: [
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
        "proposals",
        "proposals.proposerUser",
      ],
      order: { id: "DESC" },
    });

    let activeMatch: ActiveMatchDto | null = null;
    let pendingProposal: any = null;

    if (activeMatchEntity) {
      const isPlayerA = activeMatchEntity.playerA?.id === player.id;
      const opponent = isPlayerA
        ? activeMatchEntity.playerB
        : activeMatchEntity.playerA;

      const latestPendingProposal = activeMatchEntity.proposals?.find(
        (p) => p.status === ProposalStatus.PENDING_CONFIRMATION,
      );

      if (latestPendingProposal) {
        pendingProposal = {
          proposalId: latestPendingProposal.id,
          proposedByMe: latestPendingProposal.proposerUser?.id === userId,
          playerAScore: latestPendingProposal.playerAScore,
          playerBScore: latestPendingProposal.playerBScore,
          status: latestPendingProposal.status,
          opponentResponse: latestPendingProposal.opponentResponse,
          disputeReason: latestPendingProposal.disputeReason,
        };
      }

      activeMatch = {
        matchId: activeMatchEntity.id,
        round: activeMatchEntity.round,
        tableNumber: activeMatchEntity.tableNumber,
        opponentName: this.getUserDisplayName(
          opponent?.user,
          opponent ? `Joueur #${opponent.id}` : "BYE",
        ),
        opponentPlayerId: opponent?.id,
        status: activeMatchEntity.status,
        resultStatus:
          activeMatchEntity.resultStatus || MatchResultStatus.UNREPORTED,
        myScore: isPlayerA
          ? activeMatchEntity.playerAScore
          : activeMatchEntity.playerBScore,
        opponentScore: isPlayerA
          ? activeMatchEntity.playerBScore
          : activeMatchEntity.playerAScore,
        pendingProposal,
      };
    }

    // Determine next required action
    let nextAction: PlayerTournamentDashboardDto["nextAction"] =
      "WAIT_FOR_PAIRINGS";

    if (registration.droppedAt) {
      nextAction = "PLAYER_DROPPED";
    } else if (
      tournament.status === TournamentStatus.FINISHED ||
      tournament.isFinished
    ) {
      nextAction = "TOURNAMENT_FINISHED";
    } else if (!deckStatus.isSubmitted || !deckStatus.isValid) {
      nextAction = "SUBMIT_DECK";
    } else if (
      !registration.checkedIn &&
      (tournament.status === TournamentStatus.REGISTRATION_OPEN ||
        tournament.status === TournamentStatus.REGISTRATION_CLOSED)
    ) {
      nextAction = "CHECK_IN";
    } else if (activeMatch) {
      if (
        activeMatch.status === MatchStatus.FINISHED ||
        activeMatch.status === MatchStatus.FORFEIT
      ) {
        nextAction = "WAIT_FOR_NEXT_ROUND";
      } else if (activeMatch.resultStatus === MatchResultStatus.DISPUTED) {
        nextAction = "DISPUTE_IN_PROGRESS";
      } else if (pendingProposal) {
        nextAction = pendingProposal.proposedByMe
          ? "AWAIT_SCORE_CONFIRMATION"
          : "CONFIRM_SCORE";
      } else {
        nextAction = "REPORT_SCORE";
      }
    } else if (tournament.status === TournamentStatus.IN_PROGRESS) {
      nextAction = "WAIT_FOR_PAIRINGS";
    }

    return {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      currentRound: tournament.currentRound || 1,
      totalRounds: tournament.totalRounds || 1,
      registrationStatus: registration.status,
      checkedIn: registration.checkedIn,
      isDropped: Boolean(registration.droppedAt),
      roundStartedAt: clockStatus.roundStartedAt,
      roundDeadline: clockStatus.roundDeadline,
      isRoundPaused: clockStatus.isRoundPaused,
      remainingSeconds: clockStatus.remainingSeconds,
      deckStatus,
      activeMatch,
      nextAction,
    };
  }

  private getUserDisplayName(user?: User | null, fallback = "Inconnu"): string {
    if (!user) return fallback;
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (full) return full;
    if (user.email) return user.email.split("@")[0];
    return fallback;
  }
}
