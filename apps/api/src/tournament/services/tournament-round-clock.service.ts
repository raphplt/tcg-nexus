import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { User } from "../../user/entities/user.entity";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import { TournamentDeckSnapshotService } from "./tournament-deck-snapshot.service";

export interface RoundClockStatusResponse {
  tournamentId: number;
  currentRound: number;
  roundStartedAt: Date | null;
  roundDeadline: Date | null;
  roundDurationMinutes: number;
  isRoundPaused: boolean;
  pausedAt: Date | null;
  remainingSeconds: number;
  isExpired: boolean;
}

/**
 * Service managing tournament round clock, pause/resume, extensions, and deadline enforcement (TRN-03).
 */
@Injectable()
export class TournamentRoundClockService {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    private readonly snapshotService: TournamentDeckSnapshotService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Starts or resets the timer for a round.
   */
  async startRoundClock(
    tournamentId: number,
    roundNumber?: number,
    durationMinutes?: number,
    actor?: User,
  ): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const duration =
      durationMinutes ?? tournament.roundDurationMinutes ?? 50;
    const now = new Date();
    const deadline = new Date(now.getTime() + duration * 60 * 1000);

    tournament.roundStartedAt = now;
    tournament.roundDurationMinutes = duration;
    tournament.roundDeadline = deadline;
    tournament.isRoundPaused = false;
    tournament.pausedAt = null;

    if (roundNumber) {
      tournament.currentRound = roundNumber;
    }

    if (
      tournament.status === TournamentStatus.DRAFT ||
      tournament.status === TournamentStatus.REGISTRATION_CLOSED ||
      tournament.status === TournamentStatus.REGISTRATION_OPEN
    ) {
      tournament.status = TournamentStatus.IN_PROGRESS;
    }

    await this.tournamentRepository.save(tournament);

    // Auto-lock deck snapshots on round 1
    if (tournament.currentRound === 1) {
      await this.snapshotService.lockSnapshotsForTournament(tournamentId);
    }

    if (actor) {
      await this.auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        targetType: "TOURNAMENT",
        targetId: String(tournamentId),
        action: "START_ROUND_CLOCK",
        afterState: {
          round: tournament.currentRound,
          durationMinutes: duration,
          deadline,
        },
      });
    }

    return tournament;
  }

  /**
   * Pauses an ongoing round clock.
   */
  async pauseRoundClock(
    tournamentId: number,
    reason?: string,
    actor?: User,
  ): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    if (tournament.isRoundPaused) {
      return tournament;
    }

    tournament.isRoundPaused = true;
    tournament.pausedAt = new Date();

    await this.tournamentRepository.save(tournament);

    if (actor) {
      await this.auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        targetType: "TOURNAMENT",
        targetId: String(tournamentId),
        action: "PAUSE_ROUND_CLOCK",
        reason,
        afterState: {
          pausedAt: tournament.pausedAt,
        },
      });
    }

    return tournament;
  }

  /**
   * Resumes a paused round clock, adjusting deadline by paused elapsed time.
   */
  async resumeRoundClock(
    tournamentId: number,
    actor?: User,
  ): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    if (!tournament.isRoundPaused || !tournament.pausedAt) {
      return tournament;
    }

    const now = new Date();
    const pausedDurationMs = now.getTime() - tournament.pausedAt.getTime();

    if (tournament.roundDeadline) {
      tournament.roundDeadline = new Date(
        tournament.roundDeadline.getTime() + pausedDurationMs,
      );
    }

    tournament.isRoundPaused = false;
    tournament.pausedAt = null;

    await this.tournamentRepository.save(tournament);

    if (actor) {
      await this.auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        targetType: "TOURNAMENT",
        targetId: String(tournamentId),
        action: "RESUME_ROUND_CLOCK",
        afterState: {
          newDeadline: tournament.roundDeadline,
          pausedDurationSeconds: Math.floor(pausedDurationMs / 1000),
        },
      });
    }

    return tournament;
  }

  /**
   * Extends current round deadline by specified minutes.
   */
  async extendRoundClock(
    tournamentId: number,
    extensionMinutes: number,
    reason?: string,
    actor?: User,
  ): Promise<Tournament> {
    if (extensionMinutes <= 0) {
      throw new BadRequestException(
        "L'extension de temps doit être strictement positive.",
      );
    }

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const baseDeadline = tournament.roundDeadline
      ? new Date(tournament.roundDeadline)
      : new Date();
    const newDeadline = new Date(
      baseDeadline.getTime() + extensionMinutes * 60 * 1000,
    );

    tournament.roundDeadline = newDeadline;
    tournament.roundDurationMinutes =
      (tournament.roundDurationMinutes || 50) + extensionMinutes;

    await this.tournamentRepository.save(tournament);

    if (actor) {
      await this.auditService.record({
        actorId: actor.id,
        actorRole: actor.role,
        targetType: "TOURNAMENT",
        targetId: String(tournamentId),
        action: "EXTEND_ROUND_CLOCK",
        reason,
        afterState: {
          extensionMinutes,
          newDeadline,
        },
      });
    }

    return tournament;
  }

  /**
   * Returns current round clock status including live remaining seconds.
   */
  async getRoundClockStatus(
    tournamentId: number,
  ): Promise<RoundClockStatusResponse> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const now = new Date();
    let remainingSeconds = 0;

    if (tournament.roundDeadline) {
      const deadline = new Date(tournament.roundDeadline);
      if (tournament.isRoundPaused && tournament.pausedAt) {
        // Time remaining frozen at moment of pause
        const pausedAt = new Date(tournament.pausedAt);
        const remainingMs = deadline.getTime() - pausedAt.getTime();
        remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      } else {
        const remainingMs = deadline.getTime() - now.getTime();
        remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      }
    }

    return {
      tournamentId: tournament.id,
      currentRound: tournament.currentRound || 1,
      roundStartedAt: tournament.roundStartedAt ?? null,
      roundDeadline: tournament.roundDeadline ?? null,
      roundDurationMinutes: tournament.roundDurationMinutes || 50,
      isRoundPaused: Boolean(tournament.isRoundPaused),
      pausedAt: tournament.pausedAt ?? null,
      remainingSeconds,
      isExpired: remainingSeconds === 0 && Boolean(tournament.roundStartedAt),
    };
  }
}
