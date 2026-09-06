import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { Article, ArticleStatus } from "src/article/entities/article.entity";
import { UserRole } from "src/common/enums/user";
import { Deck } from "src/deck/entities/deck.entity";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "src/match/entities/match.entity";
import { Player } from "src/player/entities/player.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "src/tournament/entities/tournament.entity";
import {
  OrganizerRole,
  TournamentOrganizer,
} from "src/tournament/entities/tournament-organizer.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "src/tournament/entities/tournament-registration.entity";
import { User } from "src/user/entities/user.entity";

/**
 * Summary report of demo preparation operations.
 */
export interface DemoPreparationReport {
  timestamp: string;
  users: Array<{ email: string; role: UserRole; isPro: boolean }>;
  tournament: {
    id: number;
    name: string;
    status: TournamentStatus;
    participantsCount: number;
    matchesCount: number;
  };
  articles: Array<{ id: number; title: string; slug: string }>;
}

/**
 * Manages idempotent seeding and resetting of demonstration data.
 * Does not truncate database tables and only affects demo-tagged records.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  static readonly DEMO_TOURNAMENT_NAME =
    "Tournoi de Démonstration 2026 — Master Cup";
  static readonly DEMO_TAG = "demo";

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepo: Repository<TournamentRegistration>,
    @InjectRepository(TournamentOrganizer)
    private readonly organizerRepo: Repository<TournamentOrganizer>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
    @InjectRepository(Deck)
    private readonly deckRepo: Repository<Deck>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  /**
   * Prepares the full demo dataset idempotently.
   *
   * @returns Summary report of prepared entities.
   */
  async prepareDemo(): Promise<DemoPreparationReport> {
    this.logger.log("Starting idempotent demo preparation...");

    const defaultPassword =
      process.env.DEMO_USERS_PASSWORD || "DemoTCGNexus2026!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 1. Prepare standard demo accounts
    const demoAccountsConfig = [
      {
        email: "admin@tcg-nexus.demo",
        firstName: "Admin",
        lastName: "Nexus",
        role: UserRole.ADMIN,
        isPro: true,
      },
      {
        email: "organizer@tcg-nexus.demo",
        firstName: "Alex",
        lastName: "Organisateur",
        role: UserRole.USER,
        isPro: true,
      },
      {
        email: "pro@tcg-nexus.demo",
        firstName: "Sophie",
        lastName: "ProGamer",
        role: UserRole.USER,
        isPro: true,
      },
      {
        email: "player@tcg-nexus.demo",
        firstName: "Lucas",
        lastName: "Joueur",
        role: UserRole.USER,
        isPro: false,
      },
      // 6 Additional tournament competitors
      ...Array.from({ length: 6 }, (_, i) => ({
        email: `player${i + 3}@tcg-nexus.demo`,
        firstName: `Joueur`,
        lastName: `Demo ${i + 3}`,
        role: UserRole.USER,
        isPro: i % 2 === 0,
      })),
    ];

    const users: User[] = [];
    const players: Player[] = [];

    for (const config of demoAccountsConfig) {
      let user = await this.userRepo.findOne({
        where: { email: config.email },
      });
      if (!user) {
        user = this.userRepo.create({
          email: config.email,
          password: hashedPassword,
          firstName: config.firstName,
          lastName: config.lastName,
          role: config.role,
          isPro: config.isPro,
          isActive: true,
          emailVerified: true,
          preferredLocale: "fr",
        });
      } else {
        user.firstName = config.firstName;
        user.lastName = config.lastName;
        user.role = config.role;
        user.isPro = config.isPro;
        user.isActive = true;
        user.emailVerified = true;
      }
      const savedUser = await this.userRepo.save(user);

      // Ensure player entity
      let player = await this.playerRepo.findOne({
        where: { user: { id: savedUser.id } },
      });
      if (!player) {
        player = this.playerRepo.create({
          user: savedUser,
          elo: 1500 + Math.floor(Math.random() * 200),
          level: 5,
          xp: 1200,
        });
        player = await this.playerRepo.save(player);
      }
      users.push(savedUser);
      players.push(player);
    }

    const organizerUser =
      users.find((u) => u.email === "organizer@tcg-nexus.demo") || users[0];

    // 2. Prepare Demo Tournament
    let tournament = await this.tournamentRepo.findOne({
      where: { name: DemoService.DEMO_TOURNAMENT_NAME },
    });

    if (!tournament) {
      tournament = this.tournamentRepo.create({
        name: DemoService.DEMO_TOURNAMENT_NAME,
        description:
          "Tournoi officiel de démonstration pour la soutenance finale TCG Nexus.",
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.IN_PROGRESS,
        maxPlayers: 8,
        minPlayers: 4,
        rules: "Format Standard — Matchs en BO3. Fair-play exigé.",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        requiresApproval: false,
        isPublic: true,
      });
      tournament = await this.tournamentRepo.save(tournament);
    }

    // Set organizer
    let organizerRecord = await this.organizerRepo.findOne({
      where: {
        tournament: { id: tournament.id },
        user: { id: organizerUser.id },
      },
    });
    if (!organizerRecord) {
      organizerRecord = this.organizerRepo.create({
        tournament,
        user: organizerUser,
        name: `${organizerUser.firstName} ${organizerUser.lastName}`,
        email: organizerUser.email,
        role: OrganizerRole.OWNER,
      });
      await this.organizerRepo.save(organizerRecord);
    }

    // Register 8 demo players
    const competitorPlayers = players.slice(2, 10);
    for (let index = 0; index < competitorPlayers.length; index++) {
      const p = competitorPlayers[index];
      let reg = await this.registrationRepo.findOne({
        where: { tournament: { id: tournament.id }, player: { id: p.id } },
      });
      if (!reg) {
        reg = this.registrationRepo.create({
          tournament,
          player: p,
          status: RegistrationStatus.CONFIRMED,
        });
        await this.registrationRepo.save(reg);
      }
    }

    // Reset/build bracket matches
    await this.resetDemoTournament();

    // 3. Prepare Demo Articles
    const demoArticles = [
      {
        title: "Championnat Mondial TCG Nexus 2026",
        slug: "tcg-nexus-world-championship-2026",
        excerpt:
          "Toutes les dates, dotations et informations clés sur le championnat 2026.",
        content:
          "Bienvenue à la nouvelle édition du championnat mondial TCG Nexus. Plus de 10 000 participants s'affronteront cette année dans les formats Standard et Étendu.",
        status: ArticleStatus.PUBLISHED,
        locale: "fr",
        publishedAt: new Date(),
      },
      {
        title: "Guide complet du Deckbuilding en Format Standard",
        slug: "guide-deckbuilding-standard-2026",
        excerpt:
          "Comment construire un deck compétitif équilibré et maximiser votre consistance.",
        content:
          "La construction d'un deck compétitif repose sur une courbe d'énergie maîtrisée, un moteur de pioche fiable et des attaquants polyvalents.",
        status: ArticleStatus.PUBLISHED,
        locale: "fr",
        publishedAt: new Date(),
      },
      {
        title: "Scanner Visuel v2 : Reconnaissance Instantanée",
        slug: "nouveautes-scanner-v2",
        excerpt:
          "Découvrez notre nouveau modèle de vision par ordinateur pour numériser votre collection en une seconde.",
        content:
          "Grâce à l'intégration des embeddings CLIP et à notre pipeline OCR de pointe, le scanner identifie vos cartes avec un taux de précision supérieur à 98%.",
        status: ArticleStatus.PUBLISHED,
        locale: "fr",
        publishedAt: new Date(),
      },
    ];

    const savedArticles: Array<{ id: number; title: string; slug: string }> =
      [];
    for (const art of demoArticles) {
      let existing = await this.articleRepo.findOne({
        where: { slug: art.slug },
      });
      if (!existing) {
        existing = this.articleRepo.create({
          ...art,
          authorId: organizerUser.id,
        });
      } else {
        existing.title = art.title;
        existing.excerpt = art.excerpt;
        existing.content = art.content;
        existing.status = art.status;
        existing.publishedAt = art.publishedAt;
      }
      const saved = await this.articleRepo.save(existing);
      savedArticles.push({
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
      });
    }

    this.logger.log("Demo preparation completed successfully.");

    return {
      timestamp: new Date().toISOString(),
      users: users.map((u) => ({
        email: u.email,
        role: u.role,
        isPro: u.isPro,
      })),
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        participantsCount: competitorPlayers.length,
        matchesCount: 4,
      },
      articles: savedArticles,
    };
  }

  /**
   * Fast targeted reset of the demonstration tournament matches back to Round 1 state.
   */
  async resetDemoTournament(): Promise<{
    success: boolean;
    tournamentId: number;
    message: string;
  }> {
    const tournament = await this.tournamentRepo.findOne({
      where: { name: DemoService.DEMO_TOURNAMENT_NAME },
      relations: ["registrations", "registrations.player", "matches"],
    });

    if (!tournament) {
      return {
        success: false,
        tournamentId: 0,
        message: "Demo tournament not found",
      };
    }

    // Delete only matches belonging to this specific demo tournament
    const existingMatches = await this.matchRepo.find({
      where: { tournament: { id: tournament.id } },
    });
    if (existingMatches.length > 0) {
      await this.matchRepo.remove(existingMatches);
    }

    // Recreate initial round 1 matches for 8 confirmed participants
    const regs = (tournament.registrations || []).filter(
      (r) => r.status === RegistrationStatus.CONFIRMED,
    );

    if (regs.length >= 8) {
      const round1Pairings = [
        [regs[0].player, regs[7].player],
        [regs[3].player, regs[4].player],
        [regs[1].player, regs[6].player],
        [regs[2].player, regs[5].player],
      ];

      for (let i = 0; i < round1Pairings.length; i++) {
        const [p1, p2] = round1Pairings[i];
        const match = this.matchRepo.create({
          tournament,
          round: 1,
          phase: MatchPhase.QUARTER_FINAL,
          playerA: p1,
          playerB: p2,
          playerAScore: 0,
          playerBScore: 0,
          status: MatchStatus.SCHEDULED,
        });
        await this.matchRepo.save(match);
      }
    }

    tournament.status = TournamentStatus.IN_PROGRESS;
    await this.tournamentRepo.save(tournament);

    this.logger.log(
      `Targeted demo tournament reset complete for tournament #${tournament.id}`,
    );

    return {
      success: true,
      tournamentId: tournament.id,
      message: "Tournament matches reset to initial Round 1 state",
    };
  }
}
