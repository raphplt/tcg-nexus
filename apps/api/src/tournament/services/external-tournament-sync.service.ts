import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tournament, TournamentStatus, TournamentType } from "../entities";

@Injectable()
export class ExternalTournamentSyncService implements OnModuleInit {
  private readonly logger = new Logger(ExternalTournamentSyncService.name);

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async syncExternalTournaments() {
    this.logger.log("Starting synchronization of external tournaments...");
    try {
      let externalTournaments: any[] = [];
      const syncUrl = process.env.EXTERNAL_TOURNAMENT_API_URL;

      if (syncUrl) {
        try {
          const response = await fetch(syncUrl);
          if (response.ok) {
            externalTournaments = await response.json();
          } else {
            this.logger.warn(
              `Failed to fetch from ${syncUrl}, status: ${response.status}. Using fallback mock data.`,
            );
            externalTournaments = this.getMockExternalTournaments();
          }
        } catch (fetchError) {
          this.logger.error(
            `Error fetching external tournaments from ${syncUrl}. Using fallback mock data.`,
            fetchError,
          );
          externalTournaments = this.getMockExternalTournaments();
        }
      } else {
        externalTournaments = this.getMockExternalTournaments();
      }

      let createdCount = 0;
      for (const et of externalTournaments) {
        // Check if tournament already exists (by name and startDate)
        const exists = await this.tournamentRepository.findOne({
          where: {
            name: et.name,
            startDate: new Date(et.startDate),
          },
        });

        if (!exists) {
          const newTournament = this.tournamentRepository.create({
            name: et.name,
            description: et.description || "Tournoi externe synchronisé automatiquement.",
            location: et.location || "En ligne",
            startDate: new Date(et.startDate),
            endDate: new Date(et.endDate),
            type: et.type || TournamentType.SWISS_SYSTEM,
            status: et.status || TournamentStatus.REGISTRATION_OPEN,
            isPublic: true,
            isExternal: true,
            externalRegistrationUrl: et.externalRegistrationUrl,
            maxPlayers: et.maxPlayers || 128,
            minPlayers: et.minPlayers || 8,
          });
          await this.tournamentRepository.save(newTournament);
          createdCount++;
        }
      }

      this.logger.log(
        `External tournaments synchronization finished. Created ${createdCount} new tournaments.`,
      );
    } catch (error) {
      this.logger.error("Error synchronizing external tournaments:", error);
    }
  }

  onModuleInit() {
    // Run asynchronously to not block NestJS bootstrap
    setTimeout(() => {
      this.syncExternalTournaments().catch((err) => {
        this.logger.error("Startup external tournament sync failed", err);
      });
    }, 5000);
  }

  private getMockExternalTournaments() {
    const today = new Date();

    // Create dates in the future
    const date1 = new Date(today);
    date1.setDate(today.getDate() + 5);
    const date1End = new Date(date1);
    date1End.setHours(date1.getHours() + 8);

    const date2 = new Date(today);
    date2.setDate(today.getDate() + 12);
    const date2End = new Date(date2);
    date2End.setHours(date2.getHours() + 10);

    const date3 = new Date(today);
    date3.setDate(today.getDate() + 20);
    const date3End = new Date(date3);
    date3End.setHours(date3.getHours() + 18);

    return [
      {
        name: "Play! Pokémon Regional Championship Paris",
        description:
          "Rejoignez le championnat régional officiel de Paris ! Gagnez des Championship Points et qualifiez-vous pour les Championnats du Monde.",
        location: "Espace Champerret, Paris",
        startDate: date1.toISOString(),
        endDate: date1End.toISOString(),
        type: TournamentType.SWISS_SYSTEM,
        status: TournamentStatus.REGISTRATION_OPEN,
        externalRegistrationUrl: "https://rk9.gg/tournament/paris-regional-2026",
        maxPlayers: 512,
        minPlayers: 32,
      },
      {
        name: "Limitless Showdown #45",
        description:
          "Tournoi en ligne hebdomadaire gratuit organisé par Limitless TCG. Format Standard, rondes suisses suivies d'un top cut.",
        location: "Online (Discord/Limitless)",
        startDate: date2.toISOString(),
        endDate: date2End.toISOString(),
        type: TournamentType.SWISS_SYSTEM,
        status: TournamentStatus.REGISTRATION_OPEN,
        externalRegistrationUrl: "https://limitlesstcg.com/tournaments/showdown-45",
        maxPlayers: 1024,
        minPlayers: 64,
      },
      {
        name: "Spear Pillar League - Lille Cup",
        description:
          "Tournoi local au magasin de cartes à Lille. Nombreuses récompenses (boosters, cartes promo).",
        location: "Le Repaire des Cartes, Lille",
        startDate: date3.toISOString(),
        endDate: date3End.toISOString(),
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.REGISTRATION_OPEN,
        externalRegistrationUrl:
          "https://www.les-repaire-des-cartes.fr/tournois/lille-cup",
        maxPlayers: 64,
        minPlayers: 8,
      },
    ];
  }
}
