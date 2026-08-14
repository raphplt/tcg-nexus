import { Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { runWithPostgresAdvisoryLock } from "../../common/postgres-advisory-lock";
import { Tournament, TournamentStatus, TournamentType } from "../entities";

@Injectable()
export class ExternalTournamentSyncService implements OnModuleInit {
  private readonly logger = new Logger(ExternalTournamentSyncService.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async syncExternalTournaments() {
    await runWithPostgresAdvisoryLock(
      this.dataSource,
      "tcg-nexus:external-tournament-sync",
      () => this.runExternalTournamentSync(),
    );
  }

  private async runExternalTournamentSync(): Promise<void> {
    const syncUrl = process.env.EXTERNAL_TOURNAMENT_API_URL;
    if (!syncUrl) {
      this.logger.debug(
        "External tournament synchronization skipped: no API URL configured.",
      );
      return;
    }

    this.logger.log("Starting synchronization of external tournaments...");

    try {
      const response = await fetch(syncUrl);
      if (!response.ok) {
        this.logger.warn(
          `External tournament synchronization failed with status ${response.status}. No data was imported.`,
        );
        return;
      }

      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        this.logger.warn(
          "External tournament synchronization returned an invalid payload. No data was imported.",
        );
        return;
      }

      let createdCount = 0;
      let skippedCount = 0;

      for (const rawTournament of payload) {
        if (
          typeof rawTournament !== "object" ||
          rawTournament === null ||
          !("name" in rawTournament) ||
          !("startDate" in rawTournament) ||
          !("endDate" in rawTournament)
        ) {
          skippedCount++;
          continue;
        }

        const et = rawTournament as Record<string, unknown>;
        const name = typeof et.name === "string" ? et.name.trim() : "";
        const startDate = new Date(String(et.startDate));
        const endDate = new Date(String(et.endDate));

        if (
          !name ||
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(endDate.getTime()) ||
          startDate >= endDate
        ) {
          skippedCount++;
          continue;
        }

        const exists = await this.tournamentRepository.findOne({
          where: {
            name,
            startDate,
          },
        });

        if (!exists) {
          const type = Object.values(TournamentType).includes(
            et.type as TournamentType,
          )
            ? (et.type as TournamentType)
            : TournamentType.SWISS_SYSTEM;
          const status = Object.values(TournamentStatus).includes(
            et.status as TournamentStatus,
          )
            ? (et.status as TournamentStatus)
            : TournamentStatus.REGISTRATION_OPEN;

          const newTournament = this.tournamentRepository.create({
            name,
            description:
              typeof et.description === "string" ? et.description : undefined,
            location:
              typeof et.location === "string" ? et.location : "En ligne",
            startDate,
            endDate,
            type,
            status,
            isPublic: true,
            isExternal: true,
            externalRegistrationUrl:
              typeof et.externalRegistrationUrl === "string"
                ? et.externalRegistrationUrl
                : undefined,
            maxPlayers: typeof et.maxPlayers === "number" ? et.maxPlayers : 128,
            minPlayers: typeof et.minPlayers === "number" ? et.minPlayers : 8,
          });
          await this.tournamentRepository.save(newTournament);
          createdCount++;
        }
      }

      this.logger.log(
        `External tournament synchronization finished. Created ${createdCount}; skipped ${skippedCount}.`,
      );
    } catch (error) {
      this.logger.error(
        "External tournament synchronization failed. No fallback data was imported.",
        error,
      );
    }
  }

  onModuleInit() {
    setTimeout(() => {
      this.syncExternalTournaments().catch((err) => {
        this.logger.error("Startup external tournament sync failed", err);
      });
    }, 5000);
  }
}
