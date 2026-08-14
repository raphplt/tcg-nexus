import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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

/** Emitted when a pairing could not be turned into a playable session. */
export interface MatchmakingFailure {
  userIds: number[];
  message: string;
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
  private onMatchFailed:
    | ((failure: MatchmakingFailure) => void | Promise<void>)
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

  /**
   * Registers the callback used to warn both players when a pairing failed,
   * so nobody silently drops out of the queue without feedback.
   */
  registerMatchFailedHandler(
    handler: (failure: MatchmakingFailure) => void | Promise<void>,
  ) {
    this.onMatchFailed = handler;
  }

  isQueued(userId: number): boolean {
    return this.queue.has(userId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Adds a player to the matchmaking queue and immediately tries to pair them.
   *
   * Everything that could make the pairing fail later (missing player profile,
   * ineligible deck, game already in progress) is validated here: once two
   * players are paired they are removed from the queue, so a late failure would
   * leave both of them stranded.
   *
   * @throws NotFoundException If the user does not exist.
   * @throws BadRequestException If the player cannot queue with this deck.
   * @returns The pairing result when an opponent was available, null otherwise.
   */
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
      throw new NotFoundException("User not found");
    }

    if (await this.casualMatchService.hasOngoingSession(userId)) {
      throw new BadRequestException(
        "Finish or leave your current game before queuing again",
      );
    }

    await this.casualMatchService.assertCanQueue(userId, deckId);

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
      const result = await this.pair(entry, opponent);
      if (result && this.onMatchFound) {
        await this.onMatchFound(result);
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

  /**
   * Turns two queue entries into a started session.
   *
   * If anything fails while building the session both players are put back in
   * the queue and notified, instead of being silently dropped with a session
   * stuck in `WAITING_FOR_DECKS`.
   *
   * @returns The pairing result, or null when the pairing could not complete.
   */
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

    let createdSessionId: number | null = null;

    try {
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
      createdSessionId = session.id;

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
    } catch (error) {
      this.logger.error(
        `Pairing failed for users ${requester.userId} and ${opponent.userId}`,
        error as Error,
      );
      await this.handlePairingFailure(
        [requester.userId, opponent.userId],
        createdSessionId,
        error,
      );
      return null;
    }
  }

  /**
   * Cleans up after a failed pairing: the half-built session is cancelled and
   * both players are told why they left the queue.
   *
   * They are deliberately *not* re-queued: the usual causes (missing player
   * profile, deck edited into an invalid state) are permanent, and retrying
   * every rebalance tick would loop forever.
   */
  private async handlePairingFailure(
    userIds: number[],
    sessionId: number | null,
    error: unknown,
  ): Promise<void> {
    if (sessionId !== null) {
      try {
        await this.casualMatchService.cancelOrphanSession(sessionId);
      } catch (cleanupError) {
        this.logger.error(
          `Unable to cancel orphan session ${sessionId}`,
          cleanupError as Error,
        );
      }
    }

    if (!this.onMatchFailed) {
      return;
    }

    const message =
      error instanceof Error ? error.message : "Unable to start the match";

    await this.onMatchFailed({ userIds, message });
  }

  private async loadUserElo(userId: number): Promise<number> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });
    return player?.elo ?? 1000;
  }

  private async reloadSession(sessionId: number): Promise<CasualMatchSession> {
    const session = await this.casualMatchService.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundException("Session not found after creation");
    }

    return session;
  }
}
