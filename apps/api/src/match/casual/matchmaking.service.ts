import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly queue = new Map<number, QueueEntry>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly casualMatchService: CasualMatchService,
  ) {}

  isQueued(userId: number): boolean {
    return this.queue.has(userId);
  }

  getQueueSize(): number {
    return this.queue.size;
  }

  async joinQueue(
    userId: number,
    deckId: number,
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

    this.queue.set(userId, {
      userId,
      userName,
      deckId,
      joinedAt: Date.now(),
    });

    this.logger.log(
      `User ${userId} joined matchmaking queue (deck ${deckId}). Queue size: ${this.queue.size}`,
    );

    return this.tryMatch(userId);
  }

  leaveQueue(userId: number): void {
    this.queue.delete(userId);
    this.logger.log(
      `User ${userId} left matchmaking queue. Queue size: ${this.queue.size}`,
    );
  }

  private async tryMatch(
    requesterId: number,
  ): Promise<MatchmakingResult | null> {
    if (this.queue.size < 2) {
      return null;
    }

    const requesterEntry = this.queue.get(requesterId);
    if (!requesterEntry) {
      return null;
    }

    // Find the first other player in the queue
    let opponent: QueueEntry | null = null;
    for (const [uid, entry] of this.queue) {
      if (uid !== requesterId) {
        opponent = entry;
        break;
      }
    }

    if (!opponent) {
      return null;
    }

    // Remove both from queue before creating session
    this.queue.delete(requesterId);
    this.queue.delete(opponent.userId);

    this.logger.log(
      `Matchmaking: pairing user ${requesterId} with user ${opponent.userId}`,
    );

    const [playerAUser, playerBUser] = await Promise.all([
      this.userRepository.findOneOrFail({ where: { id: requesterId } }),
      this.userRepository.findOneOrFail({ where: { id: opponent.userId } }),
    ]);

    const session = await this.casualMatchService.createSession(
      playerAUser,
      playerBUser,
    );

    // Auto-select decks since both players chose one when joining the queue
    await this.casualMatchService.selectDeck(
      session.id,
      playerAUser,
      requesterEntry.deckId,
    );
    const finalView = await this.casualMatchService.selectDeck(
      session.id,
      playerBUser,
      opponent.deckId,
    );

    return {
      matched: true,
      session: await this.reloadSession(session.id),
      playerAUserId: requesterId,
      playerBUserId: opponent.userId,
    };
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
