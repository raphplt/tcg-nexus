import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { Article } from "src/article/entities/article.entity";
import { Card } from "src/card/entities/card.entity";
import { PokemonCardDetails } from "src/card/entities/pokemon-card-details.entity";
import {
  CardStateCode,
  CardState as CardStateEntity,
} from "src/card-state/entities/card-state.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { CardGame } from "src/common/enums/cardGame";
import { Currency } from "src/common/enums/currency";
import { DeckCardRole } from "src/common/enums/deckCardRole";
import { EnergyType } from "src/common/enums/energyType";
import { ListingStatus } from "src/common/enums/listing-status";
import { CardState, PokemonCardsType } from "src/common/enums/pokemonCardsType";
import { ProductKind } from "src/common/enums/product-kind";
import { TrainerType } from "src/common/enums/trainerType";
import { UserRole } from "src/common/enums/user";
import { Deck } from "src/deck/entities/deck.entity";
import { DeckCard } from "src/deck-card/entities/deck-card.entity";
import { DeckFormat } from "src/deck-format/entities/deck-format.entity";
import { Faq, FaqCategory } from "src/faq/entities/faq.entity";
import {
  CardEvent,
  CardEventType,
} from "src/marketplace/entities/card-event.entity";
import { CardPopularityMetrics } from "src/marketplace/entities/card-popularity-metrics.entity";
import { Listing } from "src/marketplace/entities/listing.entity";
import { Order, OrderStatus } from "src/marketplace/entities/order.entity";
import { OrderItem } from "src/marketplace/entities/order-item.entity";
import { PriceHistory } from "src/marketplace/entities/price-history.entity";
import {
  getShippingCost,
  SHIPPING_POLICY,
} from "src/marketplace/shipping-policy";
import { calculateStabilizedTrendScore } from "src/marketplace/trend-score";
import {
  Match,
  MatchPhase,
  MatchStatus,
} from "src/match/entities/match.entity";
import { MatchService } from "src/match/match.service";
import { Player } from "src/player/entities/player.entity";
import { PokemonSerie } from "src/pokemon-series/entities/pokemon-serie.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { Ranking } from "src/ranking/entities/ranking.entity";
import {
  Tournament,
  TournamentStatus,
  TournamentType,
} from "src/tournament/entities/tournament.entity";
import {
  NotificationStatus,
  NotificationType,
  TournamentNotification,
} from "src/tournament/entities/tournament-notification.entity";
import {
  OrganizerRole,
  TournamentOrganizer,
} from "src/tournament/entities/tournament-organizer.entity";
import {
  PricingType,
  TournamentPricing,
} from "src/tournament/entities/tournament-pricing.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "src/tournament/entities/tournament-registration.entity";
import {
  RewardType,
  TournamentReward,
} from "src/tournament/entities/tournament-reward.entity";
import { BracketService } from "src/tournament/services/bracket.service";
import {
  SeedingMethod,
  SeedingService,
} from "src/tournament/services/seeding.service";
import { DEFAULT_LOCALE } from "src/translation/supported-locales";
import { User } from "src/user/entities/user.entity";
import { DeepPartial, In, Repository } from "typeorm";
import {
  type CatalogImportReport,
  CatalogImportService,
} from "./catalog-import.service";
import {
  calculateRecentEventShare,
  sampleRecentCards,
} from "./trending-seed.utils";

const SEED_AVATARS = [
  "/images/avatars/pikachu.png",
  "/images/avatars/eevee.png",
  "/images/avatars/charizard.png",
  "/images/avatars/blastoise.png",
  "/images/avatars/venusaur.png",
  "/images/avatars/gengar.png",
  "/images/avatars/mewtwo.png",
  "/images/avatars/snorlax.png",
  "/images/avatars/umbreon.png",
  "/images/avatars/lucario.png",
  "/images/avatars/mew.png",
];

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly pokemonCardDetailsRepository: Repository<PokemonCardDetails>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(TournamentRegistration)
    private readonly tournamentRegistrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(TournamentReward)
    private readonly tournamentRewardRepository: Repository<TournamentReward>,
    @InjectRepository(TournamentPricing)
    private readonly tournamentPricingRepository: Repository<TournamentPricing>,
    @InjectRepository(TournamentOrganizer)
    private readonly tournamentOrganizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(TournamentNotification)
    private readonly tournamentNotificationRepository: Repository<TournamentNotification>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(CardEvent)
    private readonly cardEventRepository: Repository<CardEvent>,
    @InjectRepository(CardPopularityMetrics)
    private readonly cardPopularityMetricsRepository: Repository<CardPopularityMetrics>,
    @InjectRepository(DeckFormat)
    private readonly formatRepository: Repository<DeckFormat>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(DeckCard)
    private readonly deckCardRepository: Repository<DeckCard>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepository: Repository<CollectionItem>,
    @InjectRepository(CardStateEntity)
    private readonly cardStateRepository: Repository<CardStateEntity>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly seedingService: SeedingService,
    private readonly bracketService: BracketService,
    private readonly matchService: MatchService,
    private readonly configService: ConfigService,
    private readonly catalogImportService: CatalogImportService,
  ) {}

  /**
   * Normalise une chaîne destinée au stockage : espaces superflus supprimés,
   * forme Unicode canonique. Les accents sont conservés — « Pokémon » doit
   * rester « Pokémon » en base.
   */
  cleanString(str: string): string {
    return str.normalize("NFC").trim();
  }

  /**
   * Normalise une chaîne pour la *comparer* à une valeur connue (mapping des
   * catégories, types de dresseur, types d'énergie). Ici la perte des accents
   * est voulue : elle rend la comparaison insensible à la casse et aux
   * diacritiques. Ne jamais utiliser pour une valeur stockée.
   */
  private normalizeForMapping(value?: string): string {
    if (!value) return "";
    return (
      value
        .normalize("NFKD")
        // eslint-disable-next-line no-control-regex
        .replace(/[^\x00-\x7F]/g, "")
        .toLowerCase()
        .trim()
    );
  }

  private mapPokemonCategory(value?: string): PokemonCardsType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "pokemon":
        return PokemonCardsType.Pokemon;
      case "energie":
      case "energy":
        return PokemonCardsType.Energy;
      case "dresseur":
      case "trainer":
        return PokemonCardsType.Trainer;
      default:
        return undefined;
    }
  }

  private mapTrainerType(value?: string): TrainerType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "supporter":
        return TrainerType.Supporter;
      case "objet":
      case "item":
        return TrainerType.Item;
      case "stade":
      case "stadium":
        return TrainerType.Stadium;
      case "outil":
      case "tool":
        return TrainerType.Tool;
      case "machine technique":
      case "technical machine":
        return TrainerType.TechnicalMachine;
      default:
        return undefined;
    }
  }

  private mapEnergyType(value?: string): EnergyType | undefined {
    const normalized = this.normalizeForMapping(value);
    switch (normalized) {
      case "de base":
      case "basic":
        return EnergyType.Basic;
      case "special":
      case "speciale":
      case "speciales":
      case "special energy":
      case "speciale energie":
      case "specialeenergie":
        return EnergyType.Special;
      default:
        return undefined;
    }
  }

  /**
   * Create default collections for a user
   * @param {number} userId - The user ID
   */
  async createDefaultCollections(userId: number): Promise<void> {
    await this.collectionRepository.save([
      this.collectionRepository.create({
        name: "Wishlist",
        description: "Default wishlist",
        isPublic: false,
        user: { id: userId } as User,
      }),
      this.collectionRepository.create({
        name: "Favorites",
        description: "Default favorites",
        isPublic: false,
        user: { id: userId } as User,
      }),
    ]);
  }

  /**
   * Seed card states
   */
  async seedCardStates(): Promise<CardStateEntity[]> {
    const cardStatesData = [
      { code: CardStateCode.NM, label: "Near Mint" },
      { code: CardStateCode.EX, label: "Excellent" },
      { code: CardStateCode.GD, label: "Good" },
      { code: CardStateCode.LP, label: "Lightly Played" },
      { code: CardStateCode.PL, label: "Played" },
      { code: CardStateCode.Poor, label: "Poor" },
    ];

    const states: CardStateEntity[] = [];
    for (const stateData of cardStatesData) {
      let state = await this.cardStateRepository.findOne({
        where: { code: stateData.code },
      });
      if (!state) {
        state = this.cardStateRepository.create(stateData);
        states.push(state);
      }
    }

    if (states.length > 0) {
      await this.cardStateRepository.save(states);
    }

    return await this.cardStateRepository.find();
  }
  /**
   * Importe le catalogue Pokémon (séries, sets, cartes et leurs traductions)
   * depuis le dataset local. Voir `CatalogImportService`.
   *
   * Les trois anciennes méthodes ne faisaient qu'une passe monolingue sur
   * `data/` ; elles délèguent désormais à un import unique, qui traite toutes
   * les langues activées en une fois.
   */
  async importPokemon(): Promise<CatalogImportReport> {
    return this.catalogImportService.importCatalog();
  }

  /**
   * Seed test users (dev only)
   */
  async seedUsers() {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log("⚠️  Skipping test users seed in production environment.");
      return [];
    }

    // Bypass TypeScript transpilation of dynamic import to require()
    const { faker } = await (eval('import("@faker-js/faker")') as Promise<
      typeof import("@faker-js/faker")
    >);
    const usersData: Array<
      Omit<
        User,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "refreshToken"
        | "previousRefreshToken"
        | "previousRefreshTokenExpiresAt"
      >
    > = [
      {
        email: "test1@test.com",
        firstName: "Test",
        lastName: "User1",
        password: "password1",
        avatarUrl: "/images/avatars/pikachu.png",
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
        tournamentOrganizers: [],
      },
      {
        email: "test2@test.com",
        firstName: "Test",
        lastName: "User2",
        password: "password2",
        avatarUrl: "/images/avatars/charizard.png",
        role: UserRole.ADMIN,
        isPro: true,
        isActive: true,
        emailVerified: true,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
        tournamentOrganizers: [],
      },
      {
        email: "test3@test.com",
        firstName: "Test",
        lastName: "User3",
        password: "password3",
        avatarUrl: "/images/avatars/eevee.png",
        role: UserRole.MODERATOR,
        isPro: true,
        isActive: true,
        emailVerified: false,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
        tournamentOrganizers: [],
      },
    ];

    for (let i = 4; i <= 15; i++) {
      usersData.push({
        email: `seller${i}@test.com`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        password: `password${i}`,
        avatarUrl: SEED_AVATARS[i % SEED_AVATARS.length],
        role: UserRole.USER,
        isPro: i % 3 === 0,
        isActive: true,
        emailVerified: true,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
        tournamentOrganizers: [],
      });
    }
    const users: User[] = [];
    for (const userData of usersData) {
      const existing = await this.userRepository.findOne({
        where: { email: userData.email },
      });
      if (!existing) {
        const hash = await bcrypt.hash(userData.password, 10);
        const user = this.userRepository.create({
          ...userData,
          password: hash,
        });
        users.push(user);
      }
    }
    if (users.length > 0) {
      await this.userRepository.save(users);

      // Create default collections for each new user
      for (const user of users) {
        await this.createDefaultCollections(user.id);
      }
    }
    return users;
  }

  /**
   * Create a single user (for production use)
   */
  async createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new Error(`User with email ${email} already exists`);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hash,
      firstName,
      lastName,
      role,
      isPro: false,
      isActive: true,
      emailVerified: true,
      preferredCurrency: Currency.EUR,
      preferredLocale: DEFAULT_LOCALE,
      decks: [],
      collections: [],
    });

    await this.userRepository.save(user);
    await this.createDefaultCollections(user.id);
    console.log(`✅ User created: ${email} (${role})`);
    return user;
  }

  /**
   * Seed test tournaments with related entities (dev only)
   */
  async seedTournaments() {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log(
        "⚠️  Skipping test tournaments seed in production environment.",
      );
      return [];
    }
    // Create seed players (reusing existing entities if present)
    const players: Player[] = [];

    // Get existing users to create players for them
    const users = await this.userRepository.find({ take: 4 });

    for (const user of users) {
      let player = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
        relations: ["user"],
      });
      if (!player) {
        player = this.playerRepository.create({ user });
        await this.playerRepository.save(player);
      }
      players.push(player);
    }

    // If we don't have enough players, create additional users and players
    while (players.length < 4) {
      const userIndex = players.length + 1;
      const newUser = this.userRepository.create({
        email: `player${userIndex}@test.com`,
        firstName: `Player`,
        lastName: `${userIndex}`,
        password: await bcrypt.hash(`password${userIndex}`, 10),
        avatarUrl: SEED_AVATARS[userIndex % SEED_AVATARS.length],
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
      });
      await this.userRepository.save(newUser);

      // Create default collections for new user
      await this.createDefaultCollections(newUser.id);

      const player = this.playerRepository.create({ user: newUser });
      await this.playerRepository.save(player);
      players.push(player);
    }

    // Prepare tournament configurations
    const now = Date.now();
    const tournamentsData = [
      {
        name: "Test Tournament 1",
        description: "Premier tournoi de test",
        location: "Paris",
        startDate: new Date(now + 24 * 60 * 60 * 1000),
        endDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.REGISTRATION_OPEN,
        isFinished: false,
        isPublic: true,
        playerIndexes: [0, 1],
      },
      {
        name: "Test Tournament 2",
        description: "Deuxième tournoi de test",
        location: "Lyon",
        startDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
        type: TournamentType.ROUND_ROBIN,
        status: TournamentStatus.IN_PROGRESS,
        isFinished: false,
        isPublic: false,
        playerIndexes: [1, 2, 3],
      },
      {
        name: "Test Tournament 3",
        description: "Troisième tournoi de test",
        location: "Marseille",
        startDate: new Date(now + 6 * 24 * 60 * 60 * 1000),
        endDate: new Date(now + 8 * 24 * 60 * 60 * 1000),
        type: TournamentType.SWISS_SYSTEM,
        status: TournamentStatus.FINISHED,
        isFinished: true,
        isPublic: true,
        playerIndexes: [0, 2],
      },
    ];

    const user = await this.userRepository.findOne({
      where: { email: "test1@test.com" },
    });
    const createdTournaments: Tournament[] = [];

    for (const tData of tournamentsData) {
      let tournament = await this.tournamentRepository.findOne({
        where: { name: tData.name },
      });
      if (!tournament) {
        tournament = this.tournamentRepository.create({
          name: tData.name,
          description: tData.description,
          location: tData.location,
          startDate: tData.startDate,
          endDate: tData.endDate,
          type: tData.type,
          status: tData.status,
          isFinished: tData.isFinished,
          isPublic: tData.isPublic,
        });
        await this.tournamentRepository.save(tournament);
      }
      // Ajoute les joueurs
      tournament.players = tData.playerIndexes.map((i) => players[i]);
      await this.tournamentRepository.save(tournament);

      // Inscriptions
      for (const i of tData.playerIndexes) {
        const player = players[i];
        let registration = await this.tournamentRegistrationRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            player: { id: player.id },
          },
          relations: ["tournament", "player"],
        });
        if (!registration) {
          registration = this.tournamentRegistrationRepository.create({
            tournament,
            player,
            status: RegistrationStatus.CONFIRMED,
            paymentCompleted: true,
          });
          await this.tournamentRegistrationRepository.save(registration);
        }
      }

      // Tournament reward
      let reward = await this.tournamentRewardRepository.findOne({
        where: { tournament: { id: tournament.id }, position: 1 },
        relations: ["tournament"],
      });
      if (!reward) {
        reward = this.tournamentRewardRepository.create({
          tournament,
          position: 1,
          name: "Booster Box",
          type: RewardType.PRODUCT,
          isActive: true,
        });
        await this.tournamentRewardRepository.save(reward);
      }

      // Pricing
      let pricing = await this.tournamentPricingRepository.findOne({
        where: { tournament: { id: tournament.id } },
        relations: ["tournament"],
      });
      if (!pricing) {
        pricing = this.tournamentPricingRepository.create({
          tournament,
          type: PricingType.FREE,
          basePrice: 0,
          refundable: true,
          refundFeePercentage: 0,
        });
        await this.tournamentPricingRepository.save(pricing);
      }
      tournament.pricing = pricing;
      await this.tournamentRepository.save(tournament);

      // Organisateur
      if (user) {
        let organizer = await this.tournamentOrganizerRepository.findOne({
          where: { tournament: { id: tournament.id }, user: { id: user.id } },
          relations: ["tournament"],
        });
        if (!organizer) {
          organizer = this.tournamentOrganizerRepository.create({
            tournament,
            user: user,
            name: user.firstName + " " + user.lastName,
            email: user.email,
            role: OrganizerRole.OWNER,
            isActive: true,
          });
          await this.tournamentOrganizerRepository.save(organizer);
        }
      }

      // Notification
      let notification = await this.tournamentNotificationRepository.findOne({
        where: {
          tournament: { id: tournament.id },
          type: NotificationType.TOURNAMENT_CREATED,
        },
        relations: ["tournament"],
      });
      if (!notification) {
        notification = this.tournamentNotificationRepository.create({
          tournament,
          type: NotificationType.TOURNAMENT_CREATED,
          title: "Tournoi créé",
          message: "Le tournoi a été créé.",
          status: NotificationStatus.SENT,
          recipientCount: tData.playerIndexes.length,
          successCount: tData.playerIndexes.length,
          failureCount: 0,
        });
        await this.tournamentNotificationRepository.save(notification);
      }

      // Rankings
      for (let idx = 0; idx < tData.playerIndexes.length; idx++) {
        const player = players[tData.playerIndexes[idx]];
        let ranking = await this.rankingRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            player: { id: player.id },
          },
          relations: ["tournament", "player"],
        });
        if (!ranking) {
          ranking = this.rankingRepository.create({
            tournament,
            player,
            rank: idx + 1,
            points: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
          });
          await this.rankingRepository.save(ranking);
        }
      }

      // Matchs (un match entre les deux premiers joueurs du tournoi)
      if (tData.playerIndexes.length >= 2) {
        const playerA = players[tData.playerIndexes[0]];
        const playerB = players[tData.playerIndexes[1]];
        let match = await this.matchRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            playerA: { id: playerA.id },
            playerB: { id: playerB.id },
          },
          relations: ["tournament", "playerA", "playerB"],
        });
        if (!match) {
          match = this.matchRepository.create({
            tournament,
            playerA,
            playerB,
            round: 1,
            phase: MatchPhase.QUALIFICATION,
            status: MatchStatus.SCHEDULED,
            playerAScore: 0,
            playerBScore: 0,
          });
          await this.matchRepository.save(match);
        }
      }
      createdTournaments.push(tournament);
    }
    return createdTournaments;
  }

  /**
   * Seed a complete tournament with proper seeding and bracket generation
   */
  async seedCompleteTournament(
    name: string = "Tournoi Complet avec Seeding",
    playerCount: number = 8,
    tournamentType: TournamentType = TournamentType.SINGLE_ELIMINATION,
    seedingMethod: SeedingMethod = SeedingMethod.RANKING,
  ): Promise<Tournament> {
    // 1. Create or retrieve users/players
    const players: Player[] = [];
    const users = await this.userRepository.find({ take: playerCount });

    // Create extra users if insufficient existing count
    let currentUserCount = users.length;
    while (currentUserCount < playerCount) {
      const userIndex = currentUserCount + 1;
      const newUser = this.userRepository.create({
        email: `player${userIndex}@tournament.com`,
        firstName: `Player`,
        lastName: `${userIndex}`,
        password: await bcrypt.hash(`password${userIndex}`, 10),
        avatarUrl: SEED_AVATARS[userIndex % SEED_AVATARS.length],
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        preferredCurrency: Currency.EUR,
        preferredLocale: DEFAULT_LOCALE,
        decks: [],
        collections: [],
      });
      await this.userRepository.save(newUser);

      // Create default collections for new user
      await this.createDefaultCollections(newUser.id);
      users.push(newUser);
      currentUserCount++;
    }

    // Create associated player profiles
    for (const user of users.slice(0, playerCount)) {
      let player = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
        relations: ["user"],
      });
      if (!player) {
        player = this.playerRepository.create({ user });
        await this.playerRepository.save(player);
      }
      players.push(player);
    }

    // 2. Create tournament entity
    const tournament = this.tournamentRepository.create({
      name,
      description: `Tournoi automatique avec ${playerCount} joueurs`,
      location: "Tournoi de démonstration",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
      type: tournamentType,
      status: TournamentStatus.REGISTRATION_OPEN,
      isFinished: false,
      isPublic: true,
      minPlayers: playerCount,
      maxPlayers: playerCount,
    });
    await this.tournamentRepository.save(tournament);

    // 3. Register all players
    for (const player of players) {
      const registration = this.tournamentRegistrationRepository.create({
        tournament,
        player,
        status: RegistrationStatus.CONFIRMED,
        paymentCompleted: true,
        checkedIn: true,
      });
      await this.tournamentRegistrationRepository.save(registration);
    }

    // 4. Add tournament configurations
    const pricing = this.tournamentPricingRepository.create({
      tournament,
      type: PricingType.FREE,
      basePrice: 0,
      refundable: true,
      refundFeePercentage: 0,
    });
    await this.tournamentPricingRepository.save(pricing);

    const reward = this.tournamentRewardRepository.create({
      tournament,
      position: 1,
      name: "Trophée du Champion",
      type: RewardType.PRODUCT,
      isActive: true,
    });
    await this.tournamentRewardRepository.save(reward);

    // 5. Apply player seeding
    console.log(`🎯 Application du seeding méthode: ${seedingMethod}`);
    const seededPlayers = await this.seedingService.seedPlayers(
      players,
      tournament,
      seedingMethod,
    );

    // 6. Start tournament BEFORE generating bracket
    tournament.players = seededPlayers;
    tournament.status = TournamentStatus.IN_PROGRESS;
    tournament.currentRound = 1;
    await this.tournamentRepository.save(tournament);

    // 7. Generate full bracket structure (tournament status IN_PROGRESS)
    console.log("🏆 Generating bracket...");
    const bracketStructure = await this.bracketService.generateBracket(
      tournament.id,
    );

    // 8. Update total rounds count
    tournament.totalRounds = bracketStructure.totalRounds;
    await this.tournamentRepository.save(tournament);

    // 9. Initialize standings rankings
    for (let i = 0; i < seededPlayers.length; i++) {
      const ranking = this.rankingRepository.create({
        tournament,
        player: seededPlayers[i],
        rank: i + 1,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
      });
      await this.rankingRepository.save(ranking);
    }

    console.log(`✅ Tournoi complet créé: ${tournament.name}`);
    console.log(`   - ${playerCount} joueurs inscrits et seedés`);
    console.log(`   - ${bracketStructure.totalRounds} rounds générés`);
    console.log(`   - Statut: ${tournament.status}`);

    return tournament;
  }

  /**
   * Seed test articles
   */
  async seedArticles() {
    const articlesSeed = [
      {
        title: "Nouvelle extension Pokémon TCG : Tempête Argentée",
        image:
          "https://images.pexels.com/photos/1716861/pexels-photo-1716861.jpeg",
        link: "https://www.pokemon.com/fr/actu-pokemon/nouvelle-extension-tempete-argentee/",
        content:
          "Découvrez la nouvelle extension Tempête Argentée du JCC Pokémon avec de nouvelles cartes et mécaniques de jeu.",
        publishedAt: new Date("2024-06-01T10:00:00Z"),
      },
      {
        title: "Tournoi régional de Lyon : Résultats et analyses",
        image:
          "https://images.pexels.com/photos/8430275/pexels-photo-8430275.jpeg",
        link: "https://www.pokemon.com/fr/actu-pokemon/tournoi-lyon-2024/",
        content:
          "Retour sur le tournoi régional de Lyon avec les decks gagnants et les moments forts de la compétition.",
        publishedAt: new Date("2024-05-20T15:00:00Z"),
      },
      {
        title: "Guide stratégique : Bien débuter sur Pokémon TCG Online",
        image:
          "https://images.pexels.com/photos/243698/pexels-photo-243698.jpeg",
        link: "https://www.pokemon.com/fr/strategie/guide-debutant-tcg-online/",
        content:
          "Nos conseils pour bien démarrer sur la plateforme Pokémon TCG Online et construire un deck efficace.",
        publishedAt: new Date("2024-05-10T09:00:00Z"),
      },
    ];

    for (const article of articlesSeed) {
      const exists = await this.articleRepository.findOneBy({
        title: article.title,
      });
      if (!exists) {
        await this.articleRepository.save(
          this.articleRepository.create(article),
        );
      }
    }
  }

  /**
   * Seed FAQ entries with realistic data
   */
  async seedFaq() {
    const faqs: Array<Partial<Faq>> = [
      {
        question: "Comment m'inscrire à un tournoi TCG Nexus ?",
        answer:
          "Depuis l'onglet Tournois, sélectionnez l'événement qui vous intéresse puis cliquez sur \"S'inscrire\". Vous pouvez confirmer votre participation en quelques clics et suivre votre statut d'inscription en temps réel.",
        category: FaqCategory.TOURNAMENTS,
        order: 1,
      },
      {
        question: "Quelles sont les différences entre les formats de tournoi ?",
        answer:
          "Chaque tournoi précise s’il est en élimination directe, double élimination ou format suisse. Le format est indiqué sur la fiche du tournoi, avec les règles principales et le nombre de rondes prévues.",
        category: FaqCategory.TOURNAMENTS,
        order: 2,
      },
      {
        question: "Comment suivre mes résultats et mon classement ?",
        answer:
          "Votre tableau de bord affiche vos matchs, votre classement en direct et vos statistiques par tournoi. Vous pouvez également consulter les rounds à venir et recevoir des notifications de mise à jour.",
        category: FaqCategory.TOURNAMENTS,
        order: 3,
      },
      {
        question: "Comment ajouter des cartes à ma collection ?",
        answer:
          "Depuis la fiche d’une carte ou vos achats marketplace, utilisez le bouton “Ajouter à ma collection”. Vous pouvez aussi créer des collections privées ou publiques pour organiser vos cartes par thème.",
        category: FaqCategory.COLLECTION,
        order: 4,
      },
      {
        question: "Puis-je importer une collection existante ?",
        answer:
          "Oui, vous pouvez importer un fichier CSV ou ajouter en masse des cartes via l'identifiant de la carte. Vérifiez que les colonnes respectent le modèle indiqué dans l'outil d'import pour éviter les erreurs.",
        category: FaqCategory.COLLECTION,
        order: 5,
      },
      {
        question: "Comment est estimée la valeur de ma collection ?",
        answer:
          "Nous agrégeons les prix récents du marketplace et des historiques pour donner une estimation moyenne par carte. Les fluctuations sont mises à jour régulièrement pour refléter le marché actuel.",
        category: FaqCategory.COLLECTION,
        order: 6,
      },
      {
        question: "Comment mettre une carte en vente sur le marketplace ?",
        answer:
          "Rendez-vous dans “Vendre une carte”, sélectionnez la carte, l’état, la quantité et le prix. Les frais applicables et la devise choisie sont affichés avant validation afin que vous gardiez la main sur le prix final.",
        category: FaqCategory.MARKETPLACE,
        order: 7,
      },
      {
        question: "Quels moyens de paiement sont proposés ?",
        answer:
          "Les paiements sécurisés sont traités via Stripe. Les cartes bancaires les plus courantes sont acceptées et le paiement est capturé uniquement lorsque la commande est validée.",
        category: FaqCategory.MARKETPLACE,
        order: 8,
      },
      {
        question: "Que se passe-t-il si je ne reçois pas ma commande ?",
        answer:
          "Le service support peut suspendre la transaction le temps de l’enquête. Fournissez vos preuves d’expédition/réception ; un remboursement ou une re-livraison peut être proposé selon la situation.",
        category: FaqCategory.MARKETPLACE,
        order: 9,
      },
      {
        question: "Comment créer ou tester un deck ?",
        answer:
          "Dans l’onglet Decks, cliquez sur “Créer un deck”, choisissez un format puis ajoutez vos cartes. Le builder vérifie les limitations principales du format et calcule vos statistiques en direct.",
        category: FaqCategory.DECKS,
        order: 10,
      },
      {
        question: "Puis-je partager mon deck avec la communauté ?",
        answer:
          "Oui, vous pouvez publier un deck en mode public ou le partager via un lien direct. Les autres joueurs pourront l’ajouter à leurs favoris ou l’utiliser comme base pour leurs propres decks.",
        category: FaqCategory.DECKS,
        order: 11,
      },
      {
        question: "Comment sécuriser mon compte ?",
        answer:
          "Activez l’authentification sécurisée, utilisez un mot de passe unique et surveillez vos sessions actives dans les paramètres du profil. En cas d’activité suspecte, changez immédiatement votre mot de passe.",
        category: FaqCategory.ACCOUNT,
        order: 12,
      },
      {
        question: "Je n’arrive plus à me connecter, que faire ?",
        answer:
          "Utilisez le lien “Mot de passe oublié” pour réinitialiser votre accès. Si le problème persiste, contactez le support avec l’e-mail de votre compte et, si possible, une capture de l’erreur rencontrée.",
        category: FaqCategory.ACCOUNT,
        order: 13,
      },
    ];

    for (const faq of faqs) {
      const exists = await this.faqRepository.findOne({
        where: { question: faq.question },
      });
      if (!exists) {
        await this.faqRepository.save(this.faqRepository.create(faq));
      }
    }

    return this.faqRepository.find({ order: { order: "ASC" } });
  }

  /**
   * Seed test listings (dev only)
   * Crée entre 0 et 5 offres pour un échantillon de cartes Pokémon (optimisé avec batch)
   */
  async seedListings() {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log("⚠️  Skipping test listings seed in production environment.");
      return;
    }
    // Fetch seller users and sample card records
    const sellers = await this.userRepository.find();
    // Cap at 1500 cards for performance
    const cards = await this.pokemonCardRepository.find({ take: 1500 });

    if (sellers.length < 1 || cards.length < 1) {
      console.log("Pas assez de vendeurs ou de cartes pour créer des listings");
      return;
    }

    const currencies = [Currency.EUR, Currency.USD, Currency.GBP];
    const cardStates = [
      CardState.NM,
      CardState.EX,
      CardState.GD,
      CardState.LP,
      CardState.PL,
      CardState.Poor,
    ];

    const listingsToCreate: Listing[] = [];
    const priceHistoriesToCreate: PriceHistory[] = [];
    const now = new Date();

    // Create between 0 and 5 listings per card
    for (const card of cards) {
      // Random listings count for current card (0 to 5)
      const listingCount = Math.floor(Math.random() * 6);

      for (let i = 0; i < listingCount; i++) {
        // Pick random seller
        const randomSeller =
          sellers[Math.floor(Math.random() * sellers.length)];

        // Generate random price between 0.50 and 100.00
        const basePrice = Math.random() * 99.5 + 0.5;
        const price = Math.round(basePrice * 100) / 100;

        // Select random currency
        const currency =
          currencies[Math.floor(Math.random() * currencies.length)];

        // Select random card condition state
        const cardState =
          cardStates[Math.floor(Math.random() * cardStates.length)];

        // Available quantity between 1 and 5
        const quantityAvailable = Math.floor(Math.random() * 5) + 1;

        const status =
          Math.random() < 0.1 ? ListingStatus.INACTIVE : ListingStatus.ACTIVE;

        // Instantiate listing entity
        const listing = this.listingRepository.create({
          seller: randomSeller,
          pokemonCard: card,
          price: price,
          currency: currency,
          quantityAvailable: quantityAvailable,
          shippingCost: getShippingCost(ProductKind.CARD),
          handlingTimeDays: SHIPPING_POLICY.handlingTimeDays,
          status: status,
          cardState: cardState,
          expiresAt: undefined,
        });

        listingsToCreate.push(listing);

        // Generate 1-2 price history entries per listing
        const historicalEntries = Math.floor(Math.random() * 2) + 1;

        for (let j = 0; j < historicalEntries; j++) {
          const daysAgo = Math.floor(Math.random() * 90);
          const recordedAt = new Date(
            now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
          );

          const priceVariation = 1 + (Math.random() - 0.5) * 0.4;
          const historicalPrice =
            Math.round(price * priceVariation * 100) / 100;

          const priceHistory = this.priceHistoryRepository.create({
            pokemonCard: card,
            price: historicalPrice,
            currency: currency,
            cardState: cardState,
            quantityAvailable: quantityAvailable,
            recordedAt: recordedAt,
          });

          priceHistoriesToCreate.push(priceHistory);
        }

        // Enregistrer aussi le prix actuel dans l'historique
        const currentPriceHistory = this.priceHistoryRepository.create({
          pokemonCard: card,
          price: price,
          currency: currency,
          cardState: cardState,
          quantityAvailable: quantityAvailable,
          recordedAt: now,
        });
        priceHistoriesToCreate.push(currentPriceHistory);
      }
    }

    // Save in batches of 500 to optimize memory usage
    const batchSize = 500;
    let savedCount = 0;

    for (let i = 0; i < listingsToCreate.length; i += batchSize) {
      const batch = listingsToCreate.slice(i, i + batchSize);
      await this.listingRepository.save(batch);
      savedCount += batch.length;
    }

    // Sauvegarder l'historique de prix en batch
    for (let i = 0; i < priceHistoriesToCreate.length; i += batchSize) {
      const batch = priceHistoriesToCreate.slice(i, i + batchSize);
      await this.priceHistoryRepository.save(batch);
    }

    console.log(
      `✅ ${savedCount} listings créés pour ${cards.length} cartes avec ${sellers.length} vendeurs`,
    );
  }

  async seedDeckFormats() {
    const formatsData = [
      { type: "Standard", startDate: "2023-07-01", endDate: "2024-06-30" },
      { type: "Extended", startDate: "2023-07-01", endDate: "2024-06-30" },
    ];

    const formats: DeckFormat[] = [];

    for (const f of formatsData) {
      let format = await this.formatRepository.findOne({
        where: { type: f.type },
      });
      if (!format) {
        format = this.formatRepository.create(f);
        formats.push(format);
      }
    }

    if (formats.length > 0) {
      await this.formatRepository.save(formats);
    }

    return await this.formatRepository.find();
  }

  async seedDecks() {
    const users = await this.userRepository.find();
    if (users.length === 0) return;

    const formats = await this.seedDeckFormats();
    if (formats.length === 0) return;

    const cards = await this.pokemonCardRepository.find({ take: 5 });
    if (cards.length < 2) return;
    const decks: Deck[] = [];
    for (let i = 0; i < 20; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomFormat = formats[Math.floor(Math.random() * formats.length)];
      const isPublic = i === 0 ? false : Math.random() > 0.5;

      const deck = this.deckRepository.create({
        name: `Deck Demo ${i + 1}`,
        user: randomUser,
        format: randomFormat,
        isPublic: isPublic,
      });

      decks.push(deck);
    }
    const savedDecks = await this.deckRepository.save(decks);

    const deckCards: DeckCard[] = [];
    for (const deck of savedDecks) {
      const cardCount = 10;

      for (let j = 0; j < cardCount; j++) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        deckCards.push(
          this.deckCardRepository.create({
            deck,
            card: randomCard,
            qty: Math.floor(Math.random() * 3) + 1,
            role: DeckCardRole.main,
          }),
        );
      }
    }
    await this.deckCardRepository.save(deckCards);
  }

  /**
   * Seed competitive decks from JSON preset files.
   * Creates public decks owned by the first admin user, linked to real cards in the DB.
   */
  async seedCompetitiveDecks() {
    const users = await this.userRepository.find();
    if (users.length === 0) return;

    const owner = users.find((u) => u.role === UserRole.ADMIN) ?? users[0];
    const formats = await this.seedDeckFormats();
    const standardFormat = formats.find((f) => f.type === "Standard");
    if (!standardFormat) return;

    const deckFiles = [
      "deck-lanssorien.json",
      "deck-gardevoir.json",
      "deck-gromago.json",
      "deck-zoroark-n.json",
      "deck-angoliath-rosemary.json",
      "deck-momartik-munkidori.json",
    ];

    let created = 0;

    for (const filename of deckFiles) {
      const filePath = path.join(__dirname, "data", filename);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Fichier ${filename} introuvable, ignoré.`);
        continue;
      }

      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      const existing = await this.deckRepository.findOne({
        where: { name: raw.name, user: { id: owner.id } },
      });
      if (existing) {
        console.log(`⏭️  Deck "${raw.name}" existe déjà, ignoré.`);
        continue;
      }

      const resolvedCards: { card: Card; qty: number }[] = [];
      const notFound: string[] = [];

      for (const entry of raw.cards) {
        const card = await this.pokemonCardRepository.findOne({
          where: { tcgDexId: entry.tcgDexId },
        });
        if (card) {
          resolvedCards.push({ card, qty: entry.qty });
        } else {
          notFound.push(entry.tcgDexId || entry.name);
        }
      }

      if (resolvedCards.length === 0) {
        console.log(
          `⚠️  Deck "${raw.name}" : aucune carte trouvée en BDD, ignoré.`,
        );
        continue;
      }

      const deck = this.deckRepository.create({
        name: raw.name,
        isPublic: true,
        user: owner,
        format: standardFormat,
        coverCard: resolvedCards[0]?.card,
      });
      await this.deckRepository.save(deck);

      const deckCards = resolvedCards.map((rc) =>
        this.deckCardRepository.create({
          card: rc.card,
          qty: rc.qty,
          role: DeckCardRole.main,
          deck,
        }),
      );
      await this.deckCardRepository.save(deckCards);
      created++;

      if (notFound.length > 0) {
        console.log(
          `⚠️  Deck "${raw.name}" : ${notFound.length} cartes introuvables (${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "..." : ""})`,
        );
      }
    }

    console.log(`✅ ${created} deck(s) compétitif(s) créé(s).`);
  }

  /**
   * Seeds randomized card interactions with a strong bias toward recent sets.
   *
   * @returns Promise that resolves after all generated events are persisted.
   */
  async seedCardEvents(): Promise<void> {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log(
        "⚠️  Skipping test card events seed in production environment.",
      );
      return;
    }
    console.log("🌱 Starting card events seed...");
    const users = await this.userRepository.find();
    const catalogCards = await this.pokemonCardRepository.find({
      relations: { set: true },
    });
    const cards = sampleRecentCards(catalogCards, 200);

    console.log(`Found ${users.length} users and ${cards.length} cards`);

    if (users.length < 1 || cards.length < 1) {
      console.log(
        "Pas assez d'utilisateurs ou de cartes pour créer des événements",
      );
      return;
    }

    await this.cardPopularityMetricsRepository.clear();
    await this.cardEventRepository.clear();

    const eventsToCreate: CardEvent[] = [];
    const now = new Date();
    const releaseTimestamps = cards
      .map((card) => Date.parse(card.set?.releaseDate ?? ""))
      .filter(Number.isFinite);
    const newestReleaseTimestamp =
      releaseTimestamps.length > 0
        ? Math.max(...releaseTimestamps)
        : now.getTime();

    // Recent cards receive more interactions in the latest week, producing
    // realistic momentum while every selected card retains historical data.
    for (const card of cards) {
      const eventCount = Math.floor(Math.random() * 221) + 40;
      const recentEventShare = calculateRecentEventShare(
        card,
        newestReleaseTimestamp,
      );

      for (let i = 0; i < eventCount; i++) {
        const daysAgo =
          Math.random() < recentEventShare
            ? Math.random() * 7
            : 7 + Math.random() * 83;
        const createdAt = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
        );

        const rand = Math.random();
        let eventType: CardEventType;
        if (rand < 0.6) {
          eventType = CardEventType.VIEW;
        } else if (rand < 0.8) {
          eventType = CardEventType.SEARCH;
        } else if (rand < 0.95) {
          eventType = CardEventType.FAVORITE;
        } else {
          eventType = CardEventType.ADD_TO_CART;
        }

        const randomUser =
          Math.random() > 0.3
            ? users[Math.floor(Math.random() * users.length)]
            : null;

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const context =
          eventType === CardEventType.SEARCH
            ? {
                searchQuery:
                  card.name?.substring(0, Math.floor(Math.random() * 10) + 3) ||
                  "pokemon",
                resultsCount: Math.floor(Math.random() * 100) + 1,
              }
            : eventType === CardEventType.ADD_TO_CART
              ? {
                  listingId: Math.floor(Math.random() * 1000) + 1,
                }
              : undefined;

        const event = this.cardEventRepository.create({
          card,
          eventType,
          user: randomUser || undefined,
          sessionId: randomUser ? undefined : sessionId,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          context,
          createdAt,
        });

        eventsToCreate.push(event);
      }
    }

    const batchSize = 1000;
    let savedCount = 0;

    console.log(
      `Creating ${eventsToCreate.length} events in batches of ${batchSize}...`,
    );

    for (let i = 0; i < eventsToCreate.length; i += batchSize) {
      const batch = eventsToCreate.slice(i, i + batchSize);
      try {
        await this.cardEventRepository.save(batch);
        savedCount += batch.length;
        console.log(
          `Saved batch ${Math.floor(i / batchSize) + 1}: ${savedCount}/${eventsToCreate.length} events`,
        );
      } catch (error) {
        console.error(
          `Error saving batch ${Math.floor(i / batchSize) + 1}:`,
          error,
        );
        throw error;
      }
    }

    console.log(
      `✅ ${savedCount} événements de cartes créés pour ${cards.length} cartes`,
    );
  }

  /**
   * Seeds daily popularity metrics from the generated card events.
   *
   * This method must run after {@link seedCardEvents}.
   *
   * @returns Promise that resolves after all generated metrics are persisted.
   */
  async seedCardPopularityMetrics(): Promise<void> {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log(
        "⚠️  Skipping test card popularity metrics seed in production environment.",
      );
      return;
    }
    console.log("🌱 Starting card popularity metrics seed...");

    const totalCardsToProcess = 100;
    const cardBatchSize = 10;
    const eventCardRows = await this.cardEventRepository
      .createQueryBuilder("event")
      .innerJoin("event.card", "card")
      .select("card.id", "cardId")
      .groupBy("card.id")
      .getRawMany<{ cardId: string }>();
    const eventCardIds = eventCardRows.map(({ cardId }) => cardId);

    await this.cardPopularityMetricsRepository.clear();

    const candidateCards =
      eventCardIds.length > 0
        ? await this.pokemonCardRepository.find({
            where: { id: In(eventCardIds) },
            relations: { set: true },
          })
        : [];
    const cards = sampleRecentCards(candidateCards, totalCardsToProcess);

    console.log(
      `Found ${cards.length} event-backed cards to process for metrics`,
    );

    if (cards.length === 0) {
      console.log("No cards with seeded events were found.");
      return;
    }

    const allListings = await this.listingRepository.find({
      relations: ["pokemonCard"],
    });
    const listingsByCardId = new Map<string, Listing[]>();
    allListings.forEach((listing) => {
      const cardId = listing.pokemonCard?.id;
      if (!cardId) return;
      if (!listingsByCardId.has(cardId)) {
        listingsByCardId.set(cardId, []);
      }
      listingsByCardId.get(cardId)!.push(listing);
    });

    let totalMetricsCreated = 0;

    for (let i = 0; i < cards.length; i += cardBatchSize) {
      const cardBatch = cards.slice(i, i + cardBatchSize);
      const cardIds = cardBatch.map((c) => c.id);

      console.log(
        `Processing card batch ${Math.floor(i / cardBatchSize) + 1}/${Math.ceil(cards.length / cardBatchSize)}...`,
      );

      const events = await this.cardEventRepository
        .createQueryBuilder("event")
        .leftJoinAndSelect("event.card", "card")
        .where("card.id IN (:...cardIds)", { cardIds })
        .getMany();

      if (events.length === 0) continue;

      const eventsByCardAndDate = new Map<string, Map<string, CardEvent[]>>();

      events.forEach((event) => {
        const cardId = event.card.id;
        const dateKey = event.createdAt.toISOString().split("T")[0];

        if (!eventsByCardAndDate.has(cardId)) {
          eventsByCardAndDate.set(cardId, new Map());
        }

        const cardEventsMap = eventsByCardAndDate.get(cardId)!;
        if (!cardEventsMap.has(dateKey)) {
          cardEventsMap.set(dateKey, []);
        }

        cardEventsMap.get(dateKey)!.push(event);
      });

      const metricsToCreate: CardPopularityMetrics[] = [];

      for (const card of cardBatch) {
        const cardId = card.id;
        const dateEventsMap = eventsByCardAndDate.get(cardId);
        if (!dateEventsMap) continue;

        const cardListings = listingsByCardId.get(cardId) || [];
        const allCardEvents = events.filter((e) => e.card.id === cardId);

        for (const [dateKey, dayEvents] of dateEventsMap) {
          const date = new Date(dateKey + "T00:00:00.000Z");

          const metrics = {
            views: 0,
            searches: 0,
            favorites: 0,
            addsToCart: 0,
            sales: 0,
          };

          dayEvents.forEach((event) => {
            switch (event.eventType) {
              case CardEventType.VIEW:
                metrics.views++;
                break;
              case CardEventType.SEARCH:
                metrics.searches++;
                break;
              case CardEventType.FAVORITE:
                metrics.favorites++;
                break;
              case CardEventType.ADD_TO_CART:
                metrics.addsToCart++;
                break;
              case CardEventType.SALE:
                metrics.sales++;
                break;
            }
          });

          const activeListings = cardListings.filter(
            (l) => !l.expiresAt || new Date(l.expiresAt) > date,
          );

          const prices = activeListings.map((l) =>
            parseFloat(l.price.toString()),
          );
          const listingCount = activeListings.length;
          const minPrice = prices.length > 0 ? Math.min(...prices) : null;
          const avgPrice =
            prices.length > 0
              ? prices.reduce((a, b) => a + b, 0) / prices.length
              : null;

          const cutoff90Days = new Date(
            date.getTime() - 90 * 24 * 60 * 60 * 1000,
          );
          const cutoff7Days = new Date(
            date.getTime() - 7 * 24 * 60 * 60 * 1000,
          );
          const cutoff30Days = new Date(
            date.getTime() - 30 * 24 * 60 * 60 * 1000,
          );

          const eventsForScore = allCardEvents.filter(
            (e) => e.createdAt >= cutoff90Days && e.createdAt <= date,
          );

          const popularityScore = eventsForScore.reduce((sum, e) => {
            switch (e.eventType) {
              case CardEventType.VIEW:
                return sum + 1;
              case CardEventType.SEARCH:
                return sum + 2;
              case CardEventType.FAVORITE:
                return sum + 5;
              case CardEventType.ADD_TO_CART:
                return sum + 10;
              case CardEventType.SALE:
                return sum + 50;
              default:
                return sum;
            }
          }, 0);

          const recentEvents = allCardEvents.filter(
            (e) => e.createdAt >= cutoff7Days && e.createdAt <= date,
          );
          const baseEvents = allCardEvents.filter(
            (e) => e.createdAt >= cutoff30Days && e.createdAt < cutoff7Days,
          );

          const recentScore = recentEvents.reduce((sum, e) => {
            switch (e.eventType) {
              case CardEventType.VIEW:
                return sum + 1;
              case CardEventType.SEARCH:
                return sum + 2;
              case CardEventType.FAVORITE:
                return sum + 5;
              case CardEventType.ADD_TO_CART:
                return sum + 10;
              case CardEventType.SALE:
                return sum + 50;
              default:
                return sum;
            }
          }, 0);

          const baseScore = baseEvents.reduce((sum, e) => {
            switch (e.eventType) {
              case CardEventType.VIEW:
                return sum + 1;
              case CardEventType.SEARCH:
                return sum + 2;
              case CardEventType.FAVORITE:
                return sum + 5;
              case CardEventType.ADD_TO_CART:
                return sum + 10;
              case CardEventType.SALE:
                return sum + 50;
              default:
                return sum;
            }
          }, 0);

          const trendScore = calculateStabilizedTrendScore(
            recentScore,
            baseScore,
            7,
            23,
          );

          metricsToCreate.push(
            this.cardPopularityMetricsRepository.create({
              card: card,
              date,
              views: metrics.views,
              searches: metrics.searches,
              favorites: metrics.favorites,
              addsToCart: metrics.addsToCart,
              sales: metrics.sales,
              listingCount,
              minPrice,
              avgPrice,
              popularityScore,
              trendScore,
              updatedAt: date,
            } as DeepPartial<CardPopularityMetrics>),
          );
        }
      }

      if (metricsToCreate.length > 0) {
        await this.cardPopularityMetricsRepository.save(metricsToCreate);
        totalMetricsCreated += metricsToCreate.length;
        console.log(`Saved ${metricsToCreate.length} metrics for this batch.`);
      }

      events.length = 0;
      metricsToCreate.length = 0;
      eventsByCardAndDate.clear();
    }

    console.log(
      `✅ ${totalMetricsCreated} métriques de popularité créées au total.`,
    );
  }

  /**
   * Seeds the comprehensive demo dataset supporting the 10-minute presentation:
   * 1. Demo personas (Laura, Maxime, Théo)
   * 2. Laura's collections (140+ cards collection, 62% completed Master Set, Favorites & Rares)
   * 3. Featured card (Charizard / Dracaufeu) with 3+ listings, 180-day price history (+30%), and reference prices
   * 4. Maxime's player profile & 5 competitive Standard decks
   * 5. Maxime's 4 past finished tournaments with ELO progression history
   * 6. Théo's Open and Ongoing tournaments (with live ELO seeding and bracket progression)
   * 7. Maxime's past paid order and social activities
   */
  async seedDemoDataset(): Promise<{
    laura: User;
    maxime: User;
    theo: User;
    openTournament: Tournament;
    ongoingTournament: Tournament;
  }> {
    const isProduction =
      this.configService.get("NODE_ENV") === "production" &&
      this.configService.get("ALLOW_DEMO_SEED") !== "true";
    if (isProduction) {
      console.log("⚠️ Skipping demo dataset seed in production environment.");
      throw new Error("Demo seed is disabled in production.");
    }

    console.log("🚀 Starting comprehensive demo dataset seeding...");

    // 1. Create / Retrieve Demo Personas
    const hash = await bcrypt.hash("password1", 10);
    const demoUsersData = [
      {
        email: "laura.demo@tcg-nexus.com",
        firstName: "Laura",
        lastName: "Demo",
        avatarUrl: "/images/avatars/eevee.png",
        role: UserRole.USER,
        isPro: false,
      },
      {
        email: "maxime.demo@tcg-nexus.com",
        firstName: "Maxime",
        lastName: "Demo",
        avatarUrl: "/images/avatars/lucario.png",
        role: UserRole.USER,
        isPro: false,
      },
      {
        email: "theo.demo@tcg-nexus.com",
        firstName: "Théo",
        lastName: "Demo",
        avatarUrl: "/images/avatars/charizard.png",
        role: UserRole.ADMIN,
        isPro: true,
      },
    ];

    const usersMap = new Map<string, User>();
    for (const data of demoUsersData) {
      let user = await this.userRepository.findOne({
        where: { email: data.email },
      });
      if (!user) {
        user = this.userRepository.create({
          ...data,
          password: hash,
          isActive: true,
          emailVerified: true,
          preferredCurrency: Currency.EUR,
          preferredLocale: DEFAULT_LOCALE,
          decks: [],
          collections: [],
        });
        await this.userRepository.save(user);
        await this.createDefaultCollections(user.id);
      } else {
        user.isPro = data.isPro;
        user.role = data.role;
        user.firstName = data.firstName;
        user.lastName = data.lastName;
        user.avatarUrl = data.avatarUrl;
        user.password = hash;
        await this.userRepository.save(user);
      }
      usersMap.set(data.email, user);
    }

    const laura = usersMap.get("laura.demo@tcg-nexus.com")!;
    const maxime = usersMap.get("maxime.demo@tcg-nexus.com")!;
    const theo = usersMap.get("theo.demo@tcg-nexus.com")!;

    // 2. Setup Player Profile for Maxime & Théo
    let maximePlayer = await this.playerRepository.findOne({
      where: { user: { id: maxime.id } },
      relations: ["user"],
    });
    if (!maximePlayer) {
      maximePlayer = this.playerRepository.create({
        user: maxime,
        elo: 1540,
        level: 12,
        xp: 3400,
      });
      await this.playerRepository.save(maximePlayer);
    } else {
      maximePlayer.elo = 1540;
      maximePlayer.level = 12;
      maximePlayer.xp = 3400;
      await this.playerRepository.save(maximePlayer);
    }

    // 3. Populate Laura's Collections & Master Set
    const cardStates = await this.cardStateRepository.find();
    const nmState =
      cardStates.find((s) => s.code === CardStateCode.NM) || cardStates[0];
    const exState =
      cardStates.find((s) => s.code === CardStateCode.EX) || nmState;
    const gdState =
      cardStates.find((s) => s.code === CardStateCode.GD) || nmState;

    const allCards = await this.pokemonCardRepository.find({
      take: 300,
      relations: ["set", "set.serie"],
    });

    if (allCards.length > 0) {
      // 3.1 Main Collection (>= 140 cards)
      let lauraMainCollection = await this.collectionRepository.findOne({
        where: { user: { id: laura.id }, name: "Ma Collection Principale" },
      });
      if (!lauraMainCollection) {
        lauraMainCollection = this.collectionRepository.create({
          name: "Ma Collection Principale",
          description: "Ma collection de cartes Pokémon accumulées depuis 10 ans.",
          isPublic: true,
          user: laura,
        });
        await this.collectionRepository.save(lauraMainCollection);
      }

      // Add up to 150 items
      const existingMainItems = await this.collectionItemRepository.find({
        where: { collection: { id: lauraMainCollection.id } },
      });
      if (existingMainItems.length < 140) {
        const itemsToCreate: CollectionItem[] = [];
        const targetCount = Math.min(145, allCards.length);
        for (let i = 0; i < targetCount; i++) {
          const card = allCards[i];
          const state = i % 3 === 0 ? nmState : i % 3 === 1 ? exState : gdState;
          itemsToCreate.push(
            this.collectionItemRepository.create({
              collection: lauraMainCollection,
              pokemonCard: card,
              cardState: state,
              quantity: (i % 3) + 1,
              productKind: ProductKind.CARD,
            }),
          );
        }
        await this.collectionItemRepository.save(itemsToCreate);
      }

      // 3.2 Master Set Collection (~62% complete)
      const availableSets = await this.pokemonSetRepository.find({
        relations: ["cards"],
      });
      const targetSet =
        availableSets.find((s) => s.cards && s.cards.length >= 20) ||
        availableSets[0];

      if (targetSet) {
        let masterSetCollection = await this.collectionRepository.findOne({
          where: { user: { id: laura.id }, masterSet: { id: targetSet.id } },
        });
        if (!masterSetCollection) {
          masterSetCollection = this.collectionRepository.create({
            name: `Master Set — ${targetSet.name}`,
            description: `Collection Master Set pour l'extension ${targetSet.name}`,
            isPublic: false,
            user: laura,
            masterSet: targetSet,
          });
          await this.collectionRepository.save(masterSetCollection);
        }

        const setCards = await this.pokemonCardRepository.find({
          where: { set: { id: targetSet.id } },
        });
        const existingMasterItems = await this.collectionItemRepository.find({
          where: { collection: { id: masterSetCollection.id } },
        });

        if (existingMasterItems.length === 0 && setCards.length > 0) {
          // Take ~62% of set cards to own
          const ownedTarget = Math.max(
            1,
            Math.floor(setCards.length * 0.62),
          );
          const masterItems: CollectionItem[] = [];
          for (let i = 0; i < ownedTarget; i++) {
            masterItems.push(
              this.collectionItemRepository.create({
                collection: masterSetCollection,
                pokemonCard: setCards[i],
                cardState: nmState,
                quantity: (i % 2) + 1,
                productKind: ProductKind.CARD,
              }),
            );
          }
          await this.collectionItemRepository.save(masterItems);
        }
      }

      // 3.3 Favorites & Rares
      let lauraRaresCollection = await this.collectionRepository.findOne({
        where: { user: { id: laura.id }, name: "Favoris & Rares" },
      });
      if (!lauraRaresCollection) {
        lauraRaresCollection = this.collectionRepository.create({
          name: "Favoris & Rares",
          description: "Cartes secrètes, alternatives et holographiques rares.",
          isPublic: false,
          user: laura,
        });
        await this.collectionRepository.save(lauraRaresCollection);

        const rareItems: CollectionItem[] = [];
        for (let i = 0; i < Math.min(20, allCards.length); i++) {
          rareItems.push(
            this.collectionItemRepository.create({
              collection: lauraRaresCollection,
              pokemonCard: allCards[i],
              cardState: nmState,
              quantity: 1,
              productKind: ProductKind.CARD,
            }),
          );
        }
        await this.collectionItemRepository.save(rareItems);
      }
    }

    // 4. Featured Card (Charizard / Dracaufeu) Reference Prices & 180-day History
    const featuredCard =
      allCards.find(
        (c) =>
          c.tcgDexId?.toLowerCase().includes("charizard") ||
          c.tcgDexId?.toLowerCase().includes("dracaufeu") ||
          c.id?.toLowerCase().includes("charizard"),
      ) || allCards[0];

    if (featuredCard) {
      featuredCard.pricing = {
        cardmarket: {
          trend: 28.5,
          low: 22.0,
          avg: 29.0,
          updatedAt: new Date().toISOString(),
        },
        tcgplayer: {
          market: 32.0,
          low: 25.0,
          directLow: 24.0,
          updatedAt: new Date().toISOString(),
        },
      } as any;
      await this.pokemonCardRepository.save(featuredCard);

      // Create 3 active listings
      const sellers = await this.userRepository.find({ take: 6 });
      const activeSellers = sellers.filter((s) => s.id !== laura.id);
      const listingPrices = [24.9, 29.5, 38.0];
      for (let i = 0; i < Math.min(3, activeSellers.length); i++) {
        const seller = activeSellers[i];
        const existingListing = await this.listingRepository.findOne({
          where: {
            pokemonCard: { id: featuredCard.id },
            seller: { id: seller.id },
          },
        });
        if (!existingListing) {
          const newListing = this.listingRepository.create({
            seller,
            pokemonCard: featuredCard,
            price: listingPrices[i] || 29.9,
            currency: Currency.EUR,
            quantityAvailable: i + 1,
            cardState: CardState.NM,
            status: ListingStatus.ACTIVE,
            shippingCost: 3.5,
            handlingTimeDays: 2,
            productKind: ProductKind.CARD,
          });
          await this.listingRepository.save(newListing);
        }
      }

      // Generate 180 days of price history (+32% trend)
      const existingHistories = await this.priceHistoryRepository.find({
        where: { pokemonCard: { id: featuredCard.id } },
      });
      if (existingHistories.length < 10) {
        const priceHistories: PriceHistory[] = [];
        const nowMs = Date.now();
        const startPrice = 21.8;
        const targetPrice = 28.9;
        const totalPoints = 30;

        for (let pt = 0; pt < totalPoints; pt++) {
          const fraction = pt / (totalPoints - 1);
          const daysAgo = Math.round(180 * (1 - fraction));
          const pointDate = new Date(nowMs - daysAgo * 86400000);
          const priceValue =
            Math.round(
              (startPrice +
                (targetPrice - startPrice) * fraction +
                (Math.random() - 0.5) * 1.2) *
                100,
            ) / 100;

          priceHistories.push(
            this.priceHistoryRepository.create({
              pokemonCard: featuredCard,
              price: priceValue,
              currency: Currency.EUR,
              cardState: CardState.NM,
              quantityAvailable: 2,
              recordedAt: pointDate,
            }),
          );
        }
        await this.priceHistoryRepository.save(priceHistories);
      }
    }

    // 5. Maxime's 5 Standard Decks
    let standardFormat = await this.formatRepository.findOne({
      where: { type: "Standard" },
    });
    if (!standardFormat) {
      standardFormat = await this.formatRepository.save(
        this.formatRepository.create({
          type: "Standard",
        }),
      );
    }

    const deckNames = [
      "Dracaufeu ex / Pidgeot ex Compétitif",
      "Gardevoir ex Control",
      "Miraidon ex Speed",
      "Lugia VSTAR Archeops",
      "Lost Zone Box Giratina",
    ];

    for (let d = 0; d < deckNames.length; d++) {
      const name = deckNames[d];
      let deck = await this.deckRepository.findOne({
        where: { user: { id: maxime.id }, name },
        relations: ["cards"],
      });

      if (!deck) {
        deck = this.deckRepository.create({
          name,
          user: maxime,
          format: standardFormat,
          isPublic: true,
          coverCard: allCards[d % allCards.length],
        });
        deck = await this.deckRepository.save(deck);

        // Build 60 cards
        const deckCards: DeckCard[] = [];
        let totalCount = 0;
        let cardIdx = 0;
        while (totalCount < 60 && cardIdx < allCards.length) {
          const remaining = 60 - totalCount;
          const qty = Math.min(remaining, d === 0 ? 4 : (cardIdx % 4) + 1);
          deckCards.push(
            this.deckCardRepository.create({
              deck,
              card: allCards[cardIdx % allCards.length],
              qty,
              role: DeckCardRole.main,
            }),
          );
          totalCount += qty;
          cardIdx++;
        }
        await this.deckCardRepository.save(deckCards);
      }
    }

    // 6. Maxime's 4 Finished Tournaments (Historical ELO curve)
    const pastTournamentsData = [
      {
        name: "Tournoi d'Automne Lille 2025",
        daysAgo: 120,
        rank: 5,
        points: 6,
        wins: 2,
        losses: 2,
        draws: 0,
      },
      {
        name: "Special Event Marseille 2025",
        daysAgo: 90,
        rank: 2,
        points: 9,
        wins: 3,
        losses: 1,
        draws: 0,
      },
      {
        name: "League Cup Lyon 2026",
        daysAgo: 60,
        rank: 3,
        points: 9,
        wins: 3,
        losses: 1,
        draws: 0,
      },
      {
        name: "Championnat Régional Paris 2026",
        daysAgo: 30,
        rank: 1,
        points: 12,
        wins: 4,
        losses: 0,
        draws: 0,
      },
    ];

    for (const tInfo of pastTournamentsData) {
      let tournament = await this.tournamentRepository.findOne({
        where: { name: tInfo.name },
      });
      const startDate = new Date(Date.now() - tInfo.daysAgo * 86400000);
      const endDate = new Date(startDate.getTime() + 86400000);

      if (!tournament) {
        tournament = this.tournamentRepository.create({
          name: tInfo.name,
          description: `Tournoi compétitif Pokémon terminé (${tInfo.name})`,
          location: tInfo.name.includes("Paris")
            ? "Paris"
            : tInfo.name.includes("Lyon")
              ? "Lyon"
              : tInfo.name.includes("Marseille")
                ? "Marseille"
                : "Lille",
          startDate,
          endDate,
          type: TournamentType.SINGLE_ELIMINATION,
          status: TournamentStatus.FINISHED,
          isFinished: true,
          isPublic: true,
          minPlayers: 8,
          maxPlayers: 8,
          players: [maximePlayer],
        });
        await this.tournamentRepository.save(tournament);

        // Register Maxime
        const reg = this.tournamentRegistrationRepository.create({
          tournament,
          player: maximePlayer,
          status: RegistrationStatus.CONFIRMED,
          paymentCompleted: true,
          checkedIn: true,
        });
        await this.tournamentRegistrationRepository.save(reg);

        // Set Ranking
        const ranking = this.rankingRepository.create({
          tournament,
          player: maximePlayer,
          rank: tInfo.rank,
          points: tInfo.points,
          wins: tInfo.wins,
          losses: tInfo.losses,
          draws: tInfo.draws,
          winRate: (tInfo.wins / (tInfo.wins + tInfo.losses)) * 100,
        });
        await this.rankingRepository.save(ranking);

        // Pricing & Rewards
        await this.tournamentPricingRepository.save(
          this.tournamentPricingRepository.create({
            tournament,
            type: PricingType.FREE,
            basePrice: 0,
            refundable: true,
          }),
        );
        await this.tournamentRewardRepository.save(
          this.tournamentRewardRepository.create({
            tournament,
            position: 1,
            name: "Booster Box Pokémon",
            type: RewardType.PRODUCT,
            isActive: true,
          }),
        );

        // Organizer
        await this.tournamentOrganizerRepository.save(
          this.tournamentOrganizerRepository.create({
            tournament,
            user: theo,
            name: `${theo.firstName} ${theo.lastName}`,
            email: theo.email,
            role: OrganizerRole.OWNER,
            isActive: true,
          }),
        );
      }
    }

    // 7. Théo's Open Tournament (B5)
    let openTournament = await this.tournamentRepository.findOne({
      where: { name: "Tournoi Open de Printemps — Paris 2026" },
    });
    if (!openTournament) {
      const now = Date.now();
      openTournament = this.tournamentRepository.create({
        name: "Tournoi Open de Printemps — Paris 2026",
        description:
          "Tournoi officiel ouvert à tous. 16 places disponibles, élimination directe en format Standard.",
        location: "TCG Lounge, 42 Rue de Rivoli, 75001 Paris",
        startDate: new Date(now + 7 * 86400000),
        endDate: new Date(now + 8 * 86400000),
        registrationDeadline: new Date(now + 5 * 86400000),
        requiresApproval: false,
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.REGISTRATION_OPEN,
        isFinished: false,
        isPublic: true,
        minPlayers: 8,
        maxPlayers: 16,
      });
      await this.tournamentRepository.save(openTournament);

      // Register 4 mock players (Maxime NOT registered)
      const mockUsers = await this.userRepository.find({ take: 6 });
      const otherUsers = mockUsers.filter(
        (u) => u.id !== maxime.id && u.id !== theo.id,
      );
      for (let i = 0; i < Math.min(4, otherUsers.length); i++) {
        let player = await this.playerRepository.findOne({
          where: { user: { id: otherUsers[i].id } },
        });
        if (!player) {
          player = await this.playerRepository.save(
            this.playerRepository.create({
              user: otherUsers[i],
              elo: 1400 + i * 50,
            }),
          );
        }
        await this.tournamentRegistrationRepository.save(
          this.tournamentRegistrationRepository.create({
            tournament: openTournament,
            player,
            status: RegistrationStatus.CONFIRMED,
            paymentCompleted: true,
            checkedIn: false,
          }),
        );
      }

      await this.tournamentPricingRepository.save(
        this.tournamentPricingRepository.create({
          tournament: openTournament,
          type: PricingType.FREE,
          basePrice: 0,
          refundable: true,
        }),
      );

      await this.tournamentRewardRepository.save(
        this.tournamentRewardRepository.create({
          tournament: openTournament,
          position: 1,
          name: "Booster Box Écarlate et Violet 151",
          type: RewardType.PRODUCT,
          isActive: true,
        }),
      );

      await this.tournamentOrganizerRepository.save(
        this.tournamentOrganizerRepository.create({
          tournament: openTournament,
          user: theo,
          name: `${theo.firstName} ${theo.lastName}`,
          email: theo.email,
          role: OrganizerRole.OWNER,
          isActive: true,
        }),
      );
    }

    // 8. Théo's Ongoing Tournament (C2 / C3 / C4)
    let ongoingTournament = await this.tournamentRepository.findOne({
      where: { name: "Championnat de Printemps 2026 — Phase Finale" },
    });
    if (!ongoingTournament) {
      // Create 8 players with distinct ELO scores
      const eloLadder = [1750, 1680, 1620, 1550, 1490, 1420, 1380, 1310];
      const tournamentPlayers: Player[] = [];

      for (let i = 0; i < 8; i++) {
        let user = await this.userRepository.findOne({
          where: { email: `finalist${i + 1}@tcg-nexus.com` },
        });
        if (!user) {
          user = this.userRepository.create({
            email: `finalist${i + 1}@tcg-nexus.com`,
            firstName: `Joueur`,
            lastName: `${i + 1}`,
            password: hash,
            avatarUrl: SEED_AVATARS[i % SEED_AVATARS.length],
            role: UserRole.USER,
            isActive: true,
            emailVerified: true,
            preferredCurrency: Currency.EUR,
            preferredLocale: DEFAULT_LOCALE,
          });
          await this.userRepository.save(user);
        }

        let player = await this.playerRepository.findOne({
          where: { user: { id: user.id } },
        });
        if (!player) {
          player = this.playerRepository.create({
            user,
            elo: eloLadder[i],
            level: 10 + i,
            xp: 2500 + i * 300,
          });
          await this.playerRepository.save(player);
        } else {
          player.elo = eloLadder[i];
          await this.playerRepository.save(player);
        }
        tournamentPlayers.push(player);
      }

      const now = Date.now();
      ongoingTournament = this.tournamentRepository.create({
        name: "Championnat de Printemps 2026 — Phase Finale",
        description:
          "Phase finale du Championnat avec les 8 meilleurs joueurs seedés par ELO.",
        location: "Centre des Congrès, Lyon",
        startDate: new Date(now - 3600000), // Started 1 hour ago
        endDate: new Date(now + 24 * 3600000),
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
        totalRounds: 3,
        isFinished: false,
        isPublic: true,
        minPlayers: 8,
        maxPlayers: 8,
      });
      await this.tournamentRepository.save(ongoingTournament);

      // Seed players by ELO
      const seeded = await this.seedingService.seedPlayers(
        tournamentPlayers,
        ongoingTournament,
        SeedingMethod.ELO,
      );
      ongoingTournament.players = seeded;
      await this.tournamentRepository.save(ongoingTournament);

      // Register players (6 checked in, 2 missing check-in for live demo)
      for (let i = 0; i < seeded.length; i++) {
        const isCheckedIn = i !== 2 && i !== 6; // 2 missing check-in
        await this.tournamentRegistrationRepository.save(
          this.tournamentRegistrationRepository.create({
            tournament: ongoingTournament,
            player: seeded[i],
            status: RegistrationStatus.CONFIRMED,
            paymentCompleted: true,
            checkedIn: isCheckedIn,
          }),
        );
      }

      // Generate Bracket Matches
      // Quarterfinals (Round 1): Match 1 (0 vs 7), Match 2 (3 vs 4), Match 3 (1 vs 6), Match 4 (2 vs 5)
      // Match 1: Player 1 (seed 1) vs Player 8 (seed 8) -> Finished 2-0
      const match1 = await this.matchRepository.save(
        this.matchRepository.create({
          tournament: ongoingTournament,
          playerA: seeded[0],
          playerB: seeded[7],
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          status: MatchStatus.FINISHED,
          playerAScore: 2,
          playerBScore: 0,
          winner: seeded[0],
        }),
      );

      // Match 2: Player 4 (seed 4) vs Player 5 (seed 5) -> Finished 2-1
      const match2 = await this.matchRepository.save(
        this.matchRepository.create({
          tournament: ongoingTournament,
          playerA: seeded[3],
          playerB: seeded[4],
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          status: MatchStatus.FINISHED,
          playerAScore: 2,
          playerBScore: 1,
          winner: seeded[3],
        }),
      );

      // Match 3: Player 2 (seed 2) vs Player 7 (seed 7) -> SCHEDULED (ready for live 2-1 score entry)
      await this.matchRepository.save(
        this.matchRepository.create({
          tournament: ongoingTournament,
          playerA: seeded[1],
          playerB: seeded[6],
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          status: MatchStatus.SCHEDULED,
          playerAScore: 0,
          playerBScore: 0,
        }),
      );

      // Match 4: Player 3 (seed 3) vs Player 6 (seed 6) -> SCHEDULED
      await this.matchRepository.save(
        this.matchRepository.create({
          tournament: ongoingTournament,
          playerA: seeded[2],
          playerB: seeded[5],
          round: 1,
          phase: MatchPhase.QUALIFICATION,
          status: MatchStatus.SCHEDULED,
          playerAScore: 0,
          playerBScore: 0,
        }),
      );

      // Semi-final Match (Round 2, Match 1): Winner of Match 1 (Player 1) vs Winner of Match 2 (Player 4)
      await this.matchRepository.save(
        this.matchRepository.create({
          tournament: ongoingTournament,
          playerA: seeded[0],
          playerB: seeded[3],
          round: 2,
          phase: MatchPhase.QUALIFICATION,
          status: MatchStatus.SCHEDULED,
          playerAScore: 0,
          playerBScore: 0,
        }),
      );

      // Rankings
      for (let i = 0; i < seeded.length; i++) {
        const player = seeded[i];
        const isWinnerM1 = player.id === seeded[0].id;
        const isWinnerM2 = player.id === seeded[3].id;
        const isLoserM1 = player.id === seeded[7].id;
        const isLoserM2 = player.id === seeded[4].id;

        const wins = isWinnerM1 || isWinnerM2 ? 1 : 0;
        const losses = isLoserM1 || isLoserM2 ? 1 : 0;
        const points = wins * 3;

        await this.rankingRepository.save(
          this.rankingRepository.create({
            tournament: ongoingTournament,
            player,
            rank: i + 1,
            points,
            wins,
            losses,
            draws: 0,
            winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
          }),
        );
      }

      await this.tournamentPricingRepository.save(
        this.tournamentPricingRepository.create({
          tournament: ongoingTournament,
          type: PricingType.FREE,
          basePrice: 0,
          refundable: true,
        }),
      );

      await this.tournamentRewardRepository.save(
        this.tournamentRewardRepository.create({
          tournament: ongoingTournament,
          position: 1,
          name: "Trophée Champion de Printemps + 500 €",
          type: RewardType.PRODUCT,
          isActive: true,
        }),
      );

      await this.tournamentOrganizerRepository.save(
        this.tournamentOrganizerRepository.create({
          tournament: ongoingTournament,
          user: theo,
          name: `${theo.firstName} ${theo.lastName}`,
          email: theo.email,
          role: OrganizerRole.OWNER,
          isActive: true,
        }),
      );
    }

    // 9. Past Paid Order for Maxime
    const existingOrder = await this.orderRepository.findOne({
      where: { buyer: { id: maxime.id } },
    });
    if (!existingOrder && allCards.length > 0) {
      const order = this.orderRepository.create({
        buyer: maxime,
        totalAmount: 32.4,
        shippingAmount: 3.5,
        status: OrderStatus.PAID,
        currency: Currency.EUR,
        shippingAddress: "15 Rue de Rivoli, 75001 Paris, France",
      } as any);
      const savedOrder = (await this.orderRepository.save(order)) as unknown as Order;

      await this.orderItemRepository.save(
        this.orderItemRepository.create({
          order: savedOrder,
          seller: theo,
          unitPrice: 28.9,
          quantity: 1,
          shippingCost: 3.5,
          handlingTimeDays: 2,
          productKind: ProductKind.CARD,
        } as any),
      );
    }

    console.log("✅ Comprehensive demo dataset successfully seeded!");
    return {
      laura,
      maxime,
      theo,
      openTournament,
      ongoingTournament,
    };
  }

  /**
   * Active les extensions Postgres requises par l'application.
   * pg_trgm : recherche fuzzy par trigrammes (opérateur % et similarity()),
   * utilisée par la recherche de cartes et le scan OCR (card.service findByNameFuzzy).
   */
  async enableExtensions() {
    await this.userRepository.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    // unaccent : la recherche de cartes doit trouver « Pokémon » quand on
    // tape « pokemon », dans toutes les langues du catalogue.
    await this.userRepository.query(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    // Wrapper IMMUTABLE, seule forme indexable — voir la migration
    // CatalogTranslations et `applyCardSearch`.
    await this.userRepository.query(`
      CREATE OR REPLACE FUNCTION immutable_unaccent(text)
      RETURNS text
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
      $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
    `);
    console.log("✅ Extensions Postgres pg_trgm et unaccent activées.");
  }

  /**
   * Truncate all tables before seeding (Postgres version)
   */
  async truncateTables() {
    await this.userRepository.query(`
      TRUNCATE TABLE
        card_popularity_metrics,
        card_events,
        tournament_notification,
        tournament_organizer,
        tournament_reward,
        tournament_pricing,
        tournament_registration,
        online_match_session,
        training_match_session,
        match,
        ranking,
        tournament,
        player,
        article,
        faq,
        card,
        pokemon_set,
        pokemon_serie,
        "user"
      RESTART IDENTITY CASCADE;
    `);
  }
}
