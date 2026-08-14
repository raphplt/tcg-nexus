import { Injectable, Logger, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { runWithPostgresAdvisoryLock } from "../common/postgres-advisory-lock";
import { Match, MatchStatus } from "../match/entities/match.entity";

@Injectable()
export class NotificationReminderScheduler {
  private readonly logger = new Logger(NotificationReminderScheduler.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Cron("0 9 * * *")
  async handleDailyReminders(): Promise<void> {
    await runWithPostgresAdvisoryLock(
      this.dataSource,
      "tcg-nexus:tournament-reminders-daily",
      () => this.dispatchDailyReminders(),
    );
  }

  private async dispatchDailyReminders(): Promise<void> {
    const now = new Date();
    const startMin = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const startMax = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const matches = await this.matchRepository
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.tournament", "tournament")
      .leftJoinAndSelect("match.playerA", "playerA")
      .leftJoinAndSelect("playerA.user", "userA")
      .leftJoinAndSelect("match.playerB", "playerB")
      .leftJoinAndSelect("playerB.user", "userB")
      .where("match.scheduledDate BETWEEN :startMin AND :startMax", {
        startMin,
        startMax,
      })
      .andWhere("match.status = :status", { status: MatchStatus.SCHEDULED })
      .getMany();

    for (const match of matches) {
      const userIds: number[] = [];
      if (match.playerA?.user?.id) userIds.push(match.playerA.user.id);
      if (match.playerB?.user?.id) userIds.push(match.playerB.user.id);
      for (const userId of userIds) {
        this.eventEmitter.emit("tournament.match_reminder", {
          tournamentId: match.tournament?.id,
          matchId: match.id,
          userId,
        });
      }
    }

    this.logger.log(
      `J-1 reminders dispatched for ${matches.length} match(es).`,
    );
  }
}
