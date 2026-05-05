import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import { CasualMatchSession } from "../entities/casual-match-session.entity";
import { CasualMatchService } from "./casual-match.service";
import { QueueEntry } from "./casual-match.types";

export interface MatchmakingResult {
  matched: true;
  session: CasualMatchSession;
  playerAUserId: number;
  playerBUserId: number;
}

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly queue = new Map<number, QueueEntry>();

  // ELO matching window: starts at 50, +50 every 30s, capped at 500.
  private static readonly ELO_WINDOW_BASE = 50;
  private static readonly ELO_WINDOW_STEP = 50;
  private static readonly ELO_WINDOW_GROW_INTERVAL_MS = 30_000;
  private static readonly ELO_WINDOW_CAP = 500;
  private static readonly REBALANCE_INTERVAL_MS = 5_000;

  private rebalanceTimer: NodeJS.Timeout | null = null;
  // Notification callback so the gateway can broadcast to matched users without
  // a circular dependency on the gateway itself.
  private onMatchFound:
    | ((result: MatchmakingResult) => void | Promise<void>)
    | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly casualMatchService: CasualMatchService,
  ) {}

  onModuleInit() {
    this.rebalanceTimer = setInterval(
      () => this.runRebalance(),
      MatchmakingService.REBALANCE_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
      this.rebalanceTimer = null;
    }
  }

  registerMatchFoundHandler(
    handler: (result: MatchmakingResult) => void | Promise<void>,
  ) {
    this.onMatchFound = handler;
  }

  isQueued(userId: number): boolean {
    return this.queue.has(userId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  async joinQueue(
    userId: number,
    deckId: number,
    isRanked: boolean = false,
  ): Promise<MatchmakingResult | null> {
    if (this.queue.has(userId)) {
      this.queue.delete(userId);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const userName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    const elo = await this.loadUserElo(userId);

    this.queue.set(userId, {
      userId,
      userName,
      deckId,
      joinedAt: Date.now(),
      isRanked,
      elo,
    });

    this.logger.log(
      `User ${userId} joined queue (deck ${deckId}, ${
        isRanked ? `ranked elo=${elo}` : "casual"
      }). Size=${this.queue.size}`,
    );

    return this.tryMatchFor(userId);
  }

  leaveQueue(userId: number): void {
    if (this.queue.delete(userId)) {
      this.logger.log(
        `User ${userId} left matchmaking queue. Size=${this.queue.size}`,
      );
    }
  }

  /**
   * Best-opponent search for a single requester. Used at join time so the
   * incoming user gets matched immediately if a partner is available.
   */
  private async tryMatchFor(
    requesterId: number,
  ): Promise<MatchmakingResult | null> {
    if (this.queue.size < 2) return null;

    const requester = this.queue.get(requesterId);
    if (!requester) return null;

    const opponent = this.findBestOpponent(requester);
    if (!opponent) return null;

    return this.pair(requester, opponent);
  }

  /**
   * Periodically retries pairing for users still in queue. Important for
   * ranked: as wait time grows their ELO window widens, so previously
   * non-matchable pairs may now be valid.
   */
  private async runRebalance(): Promise<void> {
    if (this.queue.size < 2) return;
    // Iterate from oldest-waiting to newest so the player who suffered most
    // gets matched first.
    const ordered = [...this.queue.values()].sort(
      (a, b) => a.joinedAt - b.joinedAt,
    );
    for (const entry of ordered) {
      if (!this.queue.has(entry.userId)) continue; // already paired in this loop
      const opponent = this.findBestOpponent(entry);
      if (!opponent) continue;
      try {
        const result = await this.pair(entry, opponent);
        if (result && this.onMatchFound) {
          await this.onMatchFound(result);
        }
      } catch (err) {
        this.logger.error(
          `Pairing failed for users ${entry.userId} and ${opponent.userId}`,
          err as Error,
        );
      }
    }
  }

  /**
   * Returns the best opponent for `requester` already in the queue, or null.
   * Casual: any other casual entry.
   * Ranked: another ranked entry within the wider of the two ELO windows,
   * preferring the closest ELO match.
   */
  private findBestOpponent(requester: QueueEntry): QueueEntry | null {
    const requesterWindow = this.getEloWindow(requester.joinedAt);

    let best: QueueEntry | null = null;
    let bestDiff = Infinity;

    for (const candidate of this.queue.values()) {
      if (candidate.userId === requester.userId) continue;
      if (candidate.isRanked !== requester.isRanked) continue;

      if (!requester.isRanked) {
        return candidate; // casual: first available
      }

      const candidateWindow = this.getEloWindow(candidate.joinedAt);
      const allowed = Math.max(requesterWindow, candidateWindow);
      const diff = Math.abs(requester.elo - candidate.elo);
      if (diff <= allowed && diff < bestDiff) {
        best = candidate;
        bestDiff = diff;
      }
    }

    return best;
  }

  private getEloWindow(joinedAt: number): number {
    const waitMs = Date.now() - joinedAt;
    const growSteps = Math.max(
      0,
      Math.floor(waitMs / MatchmakingService.ELO_WINDOW_GROW_INTERVAL_MS),
    );
    return Math.min(
      MatchmakingService.ELO_WINDOW_CAP,
      MatchmakingService.ELO_WINDOW_BASE +
        growSteps * MatchmakingService.ELO_WINDOW_STEP,
    );
  }

  private async pair(
    requester: QueueEntry,
    opponent: QueueEntry,
  ): Promise<MatchmakingResult | null> {
    // Atomic-ish removal: if either was already removed by a concurrent flow,
    // bail out cleanly.
    if (
      !this.queue.delete(requester.userId) ||
      !this.queue.delete(opponent.userId)
    ) {
      // Restore whichever was successfully removed.
      this.queue.set(requester.userId, requester);
      this.queue.set(opponent.userId, opponent);
      return null;
    }

    this.logger.log(
      `Pairing user ${requester.userId} with ${opponent.userId} (${
        requester.isRanked
          ? `ranked Δ=${Math.abs(requester.elo - opponent.elo)}`
          : "casual"
      })`,
    );

    const [playerAUser, playerBUser] = await Promise.all([
      this.userRepository.findOneOrFail({ where: { id: requester.userId } }),
      this.userRepository.findOneOrFail({ where: { id: opponent.userId } }),
    ]);

    const isRanked = requester.isRanked && opponent.isRanked;
    const session = await this.casualMatchService.createSession(
      playerAUser,
      playerBUser,
      isRanked,
    );

    await this.casualMatchService.selectDeck(
      session.id,
      playerAUser,
      requester.deckId,
    );
    await this.casualMatchService.selectDeck(
      session.id,
      playerBUser,
      opponent.deckId,
    );

    return {
      matched: true,
      session: await this.reloadSession(session.id),
      playerAUserId: requester.userId,
      playerBUserId: opponent.userId,
    };
  }

  private async loadUserElo(userId: number): Promise<number> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });
    return player?.elo ?? 1000;
  }

  private async reloadSession(sessionId: number): Promise<CasualMatchSession> {
    const session = await this.casualMatchService["sessionRepository"].findOne({
      where: { id: sessionId },
      relations: ["playerA", "playerB"],
    });

    if (!session) {
      throw new Error("Session not found after creation");
    }

    return session;
  }
}
