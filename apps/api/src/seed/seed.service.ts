import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import * as pokemonSeriesData from 'src/common/data/pokemon_series.json';
import * as pokemonSetsData from 'src/common/data/pokemon_sets.json';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { User, UserRole } from 'src/user/entities/user.entity';
import {
  Tournament,
  TournamentType,
  TournamentStatus
} from 'src/tournament/entities/tournament.entity';
import { Player } from 'src/player/entities/player.entity';
import { Ranking } from 'src/ranking/entities/ranking.entity';
import {
  Match,
  MatchPhase,
  MatchStatus
} from 'src/match/entities/match.entity';
import {
  TournamentRegistration,
  RegistrationStatus
} from 'src/tournament/entities/tournament-registration.entity';
import {
  TournamentReward,
  RewardType
} from 'src/tournament/entities/tournament-reward.entity';
import {
  TournamentPricing,
  PricingType
} from 'src/tournament/entities/tournament-pricing.entity';
import {
  TournamentOrganizer,
  OrganizerRole
} from 'src/tournament/entities/tournament-organizer.entity';
import {
  TournamentNotification,
  NotificationType,
  NotificationStatus
} from 'src/tournament/entities/tournament-notification.entity';
import * as bcrypt from 'bcryptjs';
import { Article } from 'src/article/entities/article.entity';
import { Listing, CardState } from 'src/marketplace/entities/listing.entity';
import { PriceHistory } from 'src/marketplace/entities/price-history.entity';
import {
  CardEvent,
  CardEventType
} from 'src/marketplace/entities/card-event.entity';
import { CardPopularityMetrics } from 'src/marketplace/entities/card-popularity-metrics.entity';
import { Currency } from 'src/common/enums/currency';
import { Deck } from 'src/deck/entities/deck.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { DeckCardRole } from 'src/common/enums/deckCardRole';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';
import { Collection } from 'src/collection/entities/collection.entity';
import {
  CardState as CardStateEntity,
  CardStateCode
} from 'src/card-state/entities/card-state.entity';
import {
  SeedingService,
  SeedingMethod
} from 'src/tournament/services/seeding.service';
import { BracketService } from 'src/tournament/services/bracket.service';
import { MatchService } from 'src/match/match.service';
@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepository: Repository<PokemonCard>,
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
    @InjectRepository(CardStateEntity)
    private readonly cardStateRepository: Repository<CardStateEntity>,
    private readonly seedingService: SeedingService,
    private readonly bracketService: BracketService,
    private readonly matchService: MatchService
  ) {}

  /**
   * Clean special characters from a string
   * @param {string} str - The string to clean
   * @returns {string} - The cleaned string
   */
  cleanString(str: string): string {
    // Convert special characters to their ASCII equivalents or remove them
    // eslint-disable-next-line no-control-regex
    return str.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  }

  /**
   * Create default collections for a user
   * @param {number} userId - The user ID
   */
  async createDefaultCollections(userId: number): Promise<void> {
    await this.collectionRepository.save([
      this.collectionRepository.create({
        name: 'Wishlist',
        description: 'Default wishlist',
        isPublic: false,
        user: { id: userId } as User
      }),
      this.collectionRepository.create({
        name: 'Favorites',
        description: 'Default favorites',
        isPublic: false,
        user: { id: userId } as User
      })
    ]);
  }

  /**
   * Seed card states
   */
  async seedCardStates(): Promise<CardStateEntity[]> {
    const cardStatesData = [
      { code: CardStateCode.NM, label: 'Near Mint' },
      { code: CardStateCode.EX, label: 'Excellent' },
      { code: CardStateCode.GD, label: 'Good' },
      { code: CardStateCode.LP, label: 'Lightly Played' },
      { code: CardStateCode.PL, label: 'Played' },
      { code: CardStateCode.Poor, label: 'Poor' }
    ];

    const states: CardStateEntity[] = [];
    for (const stateData of cardStatesData) {
      let state = await this.cardStateRepository.findOne({
        where: { code: stateData.code }
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
   * Seed the database with the Pokemon Series data
   * @returns {Promise<PokemonSerie[]>} The Pokemon Series created
   * @throws {Error} If a Serie is not found
   */
  async importPokemonSeries() {
    const series: PokemonSerie[] = [];

    for (const serieData of pokemonSeriesData as DeepPartial<PokemonSerie>[]) {
      const existingSerie = await this.pokemonSerieRepository.findOne({
        where: { name: serieData.name }
      });

      if (!existingSerie) {
        const newSerie = this.pokemonSerieRepository.create(serieData);
        series.push(newSerie);
      }
    }

    if (series.length > 0) {
      await this.pokemonSerieRepository.save(series);
    }

    return series;
  }

  /**
   * Seed the database with the Pokemon Sets data
   * @returns {Promise<PokemonSet[]>} The Pokemon Sets created
   * @throws {Error} If a Serie is not found
   */
  async importPokemonSets() {
    const sets: PokemonSet[] = [];

    for (const setData of pokemonSetsData as DeepPartial<PokemonSet>[]) {
      const existingSet = await this.pokemonSetRepository.findOne({
        where: { name: setData.name }
      });

      if (!existingSet) {
        // Prefer explicit serieId from JSON, fallback to nested serie?.id if present
        const serieId = (setData as any).serieId ?? (setData as any).serie?.id;

        if (!serieId) {
          // No series information, skip this set to avoid wrong linkage
          const warnMsg = `Set '${setData.name as string}' (id: ${(setData as any).id}) without serieId – skipped.`;
          console.warn(warnMsg);
          continue;
        }

        const serie = await this.pokemonSerieRepository.findOne({
          where: { id: serieId as string }
        });

        if (!serie) {
          console.warn(
            `Serie with id '${String(serieId)}' not found for set '${setData.name as string}' – skipped.`
          );
          continue;
        }

        // Remove foreign key hints from raw JSON to avoid confusion, then attach relation
        const setProps = { ...(setData as Record<string, unknown>) };
        delete (setProps as any).serieId;
        delete (setProps as any).serie;

        const newSet = this.pokemonSetRepository.create({
          ...(setProps as DeepPartial<PokemonSet>),
          serie
        });
        sets.push(newSet);
      }
    }

    if (sets.length > 0) {
      await this.pokemonSetRepository.save(sets);
    }

    return sets;
  }

  /**
   * Seed the database with the Pokemon Series and Sets data
   *
   * @returns {Promise<{ series: PokemonSerie[], sets: PokemonSet[], cards: PokemonCard[] }>} The Pokemon Series and Sets created
   * @throws {Error} If a Serie is not found
   */
  async importPokemon(): Promise<{
    series: PokemonSerie[];
    sets: PokemonSet[];
    cards: PokemonCard[];
  }> {
    const series = await this.importPokemonSeries();
    const sets = await this.importPokemonSets();

    const zipPath = path.resolve(__dirname, '../common/data/pokemon.zip');
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to read zip file at ${zipPath}: ${error.message}`
        );
      } else {
        throw new Error(`Failed to read zip file at ${zipPath}`);
      }
    }

    const zipEntries = zip.getEntries();
    const cards: PokemonCard[] = [];

    if (zipEntries && zipEntries.length > 0) {
      const content = zipEntries[0];
      const firstEntryContent = content.getData().toString('utf8');

      try {
        if (typeof firstEntryContent !== 'string') {
          throw new Error('Invalid content type, expected a string');
        }
        const pokemonCards: any[] = JSON.parse(firstEntryContent);

        for (const cardData of pokemonCards) {
          const setId = cardData.set?.id;
          if (!setId) {
            continue;
          }
          const set = await this.pokemonSetRepository.findOne({
            where: { id: setId }
          });
          if (!set) {
            console.warn(
              `Set avec id ${setId} non trouvé pour la carte ${cardData.id}.`
            );
            continue;
          }
          delete cardData.set;
          cardData.set = set;

          cardData.tcgDexId = cardData.id;
          delete cardData.id;

          cardData.name = cardData.name
            ? this.cleanString(cardData.name as string)
            : '';
          cardData.illustrator = cardData.illustrator
            ? this.cleanString(cardData.illustrator as string)
            : null;
          cardData.description = cardData.description
            ? this.cleanString(cardData.description as string)
            : null;
          cardData.evolveFrom = cardData.evolveFrom
            ? this.cleanString(cardData.evolveFrom as string)
            : null;
          cardData.effect = cardData.effect
            ? this.cleanString(cardData.effect as string)
            : null;

          if (cardData.variants && cardData.variants.wPromo !== undefined) {
            const { ...validVariants } = cardData.variants;
            cardData.variants = validVariants;
          }
          const card = this.pokemonCardRepository.create(
            cardData as DeepPartial<PokemonCard>
          );
          cards.push(card);
        }

        if (cards.length > 0) {
          const batchSize = 500;
          for (let i = 0; i < cards.length; i += batchSize) {
            const batch = cards.slice(i, i + batchSize);
            await this.pokemonCardRepository.save(batch);
          }
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON content:', jsonError);
      }
    } else {
      console.log('No entries found in the zip file.');
    }

    return { series, sets, cards };
  }

  /**
   * Seed test users
   */
  async seedUsers() {
    // Si erreur: installer bcryptjs avec npm install bcryptjs @types/bcryptjs
    const usersData: Array<
      Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'refreshToken'>
    > = [
      {
        email: 'test1@test.com',
        firstName: 'Test',
        lastName: 'User1',
        password: 'password1',
        avatarUrl: 'https://via.placeholder.com/150',
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        decks: [],
        collections: []
      },
      {
        email: 'test2@test.com',
        firstName: 'Test',
        lastName: 'User2',
        password: 'password2',
        avatarUrl: 'https://via.placeholder.com/150',
        role: UserRole.ADMIN,
        isPro: true,
        isActive: true,
        emailVerified: true,
        decks: [],
        collections: []
      },
      {
        email: 'test3@test.com',
        firstName: 'Test',
        lastName: 'User3',
        password: 'password3',
        avatarUrl: 'https://via.placeholder.com/150',
        role: UserRole.MODERATOR,
        isPro: true,
        isActive: true,
        emailVerified: false,
        decks: [],
        collections: []
      }
    ];

    // Créer 12 utilisateurs supplémentaires pour avoir plus de vendeurs
    for (let i = 4; i <= 15; i++) {
      usersData.push({
        email: `seller${i}@test.com`,
        firstName: `Seller`,
        lastName: `${i}`,
        password: `password${i}`,
        avatarUrl: `https://via.placeholder.com/150?text=Seller${i}`,
        role: UserRole.USER,
        isPro: i % 3 === 0, // 1/3 des vendeurs sont pro
        isActive: true,
        emailVerified: true,
        decks: [],
        collections: []
      });
    }
    const users: User[] = [];
    for (const userData of usersData) {
      const existing = await this.userRepository.findOne({
        where: { email: userData.email }
      });
      if (!existing) {
        const hash = await bcrypt.hash(userData.password, 10);
        const user = this.userRepository.create({
          ...userData,
          password: hash
        });
        users.push(user);
      }
    }
    if (users.length > 0) {
      await this.userRepository.save(users);

      // Créer les collections par défaut pour chaque nouvel utilisateur
      for (const user of users) {
        await this.createDefaultCollections(user.id);
      }
    }
    return users;
  }

  /**
   * Seed test tournaments with related entities
   */
  async seedTournaments() {
    // Crée quelques joueurs (réutilise si déjà existants)
    const players: Player[] = [];

    // Get existing users to create players for them
    const users = await this.userRepository.find({ take: 4 });

    for (const user of users) {
      let player = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
        relations: ['user']
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
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        decks: [],
        collections: []
      });
      await this.userRepository.save(newUser);

      // Créer les collections par défaut pour le nouvel utilisateur
      await this.createDefaultCollections(newUser.id);

      const player = this.playerRepository.create({ user: newUser });
      await this.playerRepository.save(player);
      players.push(player);
    }

    // Prépare plusieurs configs de tournois
    const now = Date.now();
    const tournamentsData = [
      {
        name: 'Test Tournament 1',
        description: 'Premier tournoi de test',
        location: 'Paris',
        startDate: new Date(now + 24 * 60 * 60 * 1000),
        endDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
        type: TournamentType.SINGLE_ELIMINATION,
        status: TournamentStatus.REGISTRATION_OPEN,
        isFinished: false,
        isPublic: true,
        playerIndexes: [0, 1]
      },
      {
        name: 'Test Tournament 2',
        description: 'Deuxième tournoi de test',
        location: 'Lyon',
        startDate: new Date(now + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(now + 5 * 24 * 60 * 60 * 1000),
        type: TournamentType.ROUND_ROBIN,
        status: TournamentStatus.IN_PROGRESS,
        isFinished: false,
        isPublic: false,
        playerIndexes: [1, 2, 3]
      },
      {
        name: 'Test Tournament 3',
        description: 'Troisième tournoi de test',
        location: 'Marseille',
        startDate: new Date(now + 6 * 24 * 60 * 60 * 1000),
        endDate: new Date(now + 8 * 24 * 60 * 60 * 1000),
        type: TournamentType.SWISS_SYSTEM,
        status: TournamentStatus.FINISHED,
        isFinished: true,
        isPublic: true,
        playerIndexes: [0, 2]
      }
    ];

    const user = await this.userRepository.findOne({
      where: { email: 'test1@test.com' }
    });
    const createdTournaments: Tournament[] = [];

    for (const tData of tournamentsData) {
      let tournament = await this.tournamentRepository.findOne({
        where: { name: tData.name }
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
          isPublic: tData.isPublic
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
            player: { id: player.id }
          },
          relations: ['tournament', 'player']
        });
        if (!registration) {
          registration = this.tournamentRegistrationRepository.create({
            tournament,
            player,
            status: RegistrationStatus.CONFIRMED,
            paymentCompleted: true
          });
          await this.tournamentRegistrationRepository.save(registration);
        }
      }

      // Récompense
      let reward = await this.tournamentRewardRepository.findOne({
        where: { tournament: { id: tournament.id }, position: 1 },
        relations: ['tournament']
      });
      if (!reward) {
        reward = this.tournamentRewardRepository.create({
          tournament,
          position: 1,
          name: 'Booster Box',
          type: RewardType.PRODUCT,
          isActive: true
        });
        await this.tournamentRewardRepository.save(reward);
      }

      // Pricing
      let pricing = await this.tournamentPricingRepository.findOne({
        where: { tournament: { id: tournament.id } },
        relations: ['tournament']
      });
      if (!pricing) {
        pricing = this.tournamentPricingRepository.create({
          tournament,
          type: PricingType.FREE,
          basePrice: 0,
          refundable: true,
          refundFeePercentage: 0
        });
        await this.tournamentPricingRepository.save(pricing);
      }
      tournament.pricing = pricing;
      await this.tournamentRepository.save(tournament);

      // Organisateur
      if (user) {
        let organizer = await this.tournamentOrganizerRepository.findOne({
          where: { tournament: { id: tournament.id }, userId: user.id },
          relations: ['tournament']
        });
        if (!organizer) {
          organizer = this.tournamentOrganizerRepository.create({
            tournament,
            userId: user.id,
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
            role: OrganizerRole.OWNER,
            isActive: true
          });
          await this.tournamentOrganizerRepository.save(organizer);
        }
      }

      // Notification
      let notification = await this.tournamentNotificationRepository.findOne({
        where: {
          tournament: { id: tournament.id },
          type: NotificationType.TOURNAMENT_CREATED
        },
        relations: ['tournament']
      });
      if (!notification) {
        notification = this.tournamentNotificationRepository.create({
          tournament,
          type: NotificationType.TOURNAMENT_CREATED,
          title: 'Tournoi créé',
          message: 'Le tournoi a été créé.',
          status: NotificationStatus.SENT,
          recipientCount: tData.playerIndexes.length,
          successCount: tData.playerIndexes.length,
          failureCount: 0
        });
        await this.tournamentNotificationRepository.save(notification);
      }

      // Rankings
      for (let idx = 0; idx < tData.playerIndexes.length; idx++) {
        const player = players[tData.playerIndexes[idx]];
        let ranking = await this.rankingRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            player: { id: player.id }
          },
          relations: ['tournament', 'player']
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
            winRate: 0
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
            playerB: { id: playerB.id }
          },
          relations: ['tournament', 'playerA', 'playerB']
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
            playerBScore: 0
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
    name: string = 'Tournoi Complet avec Seeding',
    playerCount: number = 8,
    tournamentType: TournamentType = TournamentType.SINGLE_ELIMINATION,
    seedingMethod: SeedingMethod = SeedingMethod.RANKING
  ): Promise<Tournament> {
    // 1. Créer ou récupérer des utilisateurs/joueurs
    const players: Player[] = [];
    const users = await this.userRepository.find({ take: playerCount });

    // Si pas assez d'utilisateurs, en créer
    let currentUserCount = users.length;
    while (currentUserCount < playerCount) {
      const userIndex = currentUserCount + 1;
      const newUser = this.userRepository.create({
        email: `player${userIndex}@tournament.com`,
        firstName: `Player`,
        lastName: `${userIndex}`,
        password: await bcrypt.hash(`password${userIndex}`, 10),
        role: UserRole.USER,
        isPro: false,
        isActive: true,
        emailVerified: true,
        decks: [],
        collections: []
      });
      await this.userRepository.save(newUser);

      // Créer les collections par défaut pour le nouvel utilisateur
      await this.createDefaultCollections(newUser.id);
      users.push(newUser);
      currentUserCount++;
    }

    // Créer les joueurs associés
    for (const user of users.slice(0, playerCount)) {
      let player = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
        relations: ['user']
      });
      if (!player) {
        player = this.playerRepository.create({ user });
        await this.playerRepository.save(player);
      }
      players.push(player);
    }

    // 2. Créer le tournoi
    const tournament = this.tournamentRepository.create({
      name,
      description: `Tournoi automatique avec ${playerCount} joueurs`,
      location: 'Tournoi de démonstration',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
      type: tournamentType,
      status: TournamentStatus.REGISTRATION_OPEN,
      isFinished: false,
      isPublic: true,
      minPlayers: playerCount,
      maxPlayers: playerCount
    });
    await this.tournamentRepository.save(tournament);

    // 3. Inscrire tous les joueurs
    for (const player of players) {
      const registration = this.tournamentRegistrationRepository.create({
        tournament,
        player,
        status: RegistrationStatus.CONFIRMED,
        paymentCompleted: true,
        checkedIn: true
      });
      await this.tournamentRegistrationRepository.save(registration);
    }

    // 4. Ajouter les configurations du tournoi
    const pricing = this.tournamentPricingRepository.create({
      tournament,
      type: PricingType.FREE,
      basePrice: 0,
      refundable: true,
      refundFeePercentage: 0
    });
    await this.tournamentPricingRepository.save(pricing);

    const reward = this.tournamentRewardRepository.create({
      tournament,
      position: 1,
      name: 'Trophée du Champion',
      type: RewardType.PRODUCT,
      isActive: true
    });
    await this.tournamentRewardRepository.save(reward);

    // 5. Appliquer le seeding
    console.log(`🎯 Application du seeding méthode: ${seedingMethod}`);
    const seededPlayers = await this.seedingService.seedPlayers(
      players,
      tournament,
      seedingMethod
    );

    // 6. Démarrer le tournoi AVANT de générer le bracket
    tournament.players = seededPlayers;
    tournament.status = TournamentStatus.IN_PROGRESS;
    tournament.currentRound = 1;
    await this.tournamentRepository.save(tournament);

    // 7. Générer le bracket complet (maintenant que le tournoi est IN_PROGRESS)
    console.log('🏆 Génération du bracket...');
    const bracketStructure = await this.bracketService.generateBracket(
      tournament.id
    );

    // 8. Mettre à jour le nombre total de rounds
    tournament.totalRounds = bracketStructure.totalRounds;
    await this.tournamentRepository.save(tournament);

    // 9. Créer les rankings initiaux
    for (let i = 0; i < seededPlayers.length; i++) {
      const ranking = this.rankingRepository.create({
        tournament,
        player: seededPlayers[i],
        rank: i + 1,
        points: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0
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
        title: 'Nouvelle extension Pokémon TCG : Tempête Argentée',
        image:
          'https://images.pexels.com/photos/1716861/pexels-photo-1716861.jpeg',
        link: 'https://www.pokemon.com/fr/actu-pokemon/nouvelle-extension-tempete-argentee/',
        content:
          'Découvrez la nouvelle extension Tempête Argentée du JCC Pokémon avec de nouvelles cartes et mécaniques de jeu.',
        publishedAt: new Date('2024-06-01T10:00:00Z')
      },
      {
        title: 'Tournoi régional de Lyon : Résultats et analyses',
        image:
          'https://images.pexels.com/photos/8430275/pexels-photo-8430275.jpeg',
        link: 'https://www.pokemon.com/fr/actu-pokemon/tournoi-lyon-2024/',
        content:
          'Retour sur le tournoi régional de Lyon avec les decks gagnants et les moments forts de la compétition.',
        publishedAt: new Date('2024-05-20T15:00:00Z')
      },
      {
        title: 'Guide stratégique : Bien débuter sur Pokémon TCG Online',
        image:
          'https://images.pexels.com/photos/243698/pexels-photo-243698.jpeg',
        link: 'https://www.pokemon.com/fr/strategie/guide-debutant-tcg-online/',
        content:
          'Nos conseils pour bien démarrer sur la plateforme Pokémon TCG Online et construire un deck efficace.',
        publishedAt: new Date('2024-05-10T09:00:00Z')
      }
    ];

    for (const article of articlesSeed) {
      const exists = await this.articleRepository.findOneBy({
        title: article.title
      });
      if (!exists) {
        await this.articleRepository.save(
          this.articleRepository.create(article)
        );
      }
    }
  }

  /**
   * Seed test listings
   * Crée entre 0 et 5 offres pour un échantillon de cartes Pokémon (optimisé avec batch)
   */
  async seedListings() {
    // Récupère tous les utilisateurs (vendeurs) et un échantillon de cartes Pokémon
    const sellers = await this.userRepository.find();
    // Limiter à 1500 cartes pour éviter les performances trop longues
    const cards = await this.pokemonCardRepository.find({ take: 1500 });

    if (sellers.length < 1 || cards.length < 1) {
      console.log('Pas assez de vendeurs ou de cartes pour créer des listings');
      return;
    }

    const currencies = [Currency.EUR, Currency.USD, Currency.GBP];
    const cardStates = [
      CardState.NM,
      CardState.EX,
      CardState.GD,
      CardState.LP,
      CardState.PL,
      CardState.Poor
    ];

    const listingsToCreate: Listing[] = [];
    const priceHistoriesToCreate: PriceHistory[] = [];
    const now = new Date();

    // Pour chaque carte, créer entre 0 et 5 listings (au lieu de 20)
    for (const card of cards) {
      // Nombre aléatoire de listings pour cette carte (entre 0 et 5)
      const listingCount = Math.floor(Math.random() * 6);

      for (let i = 0; i < listingCount; i++) {
        // Sélectionner un vendeur aléatoire
        const randomSeller =
          sellers[Math.floor(Math.random() * sellers.length)];

        // Générer un prix aléatoire entre 0.50 et 100.00
        const basePrice = Math.random() * 99.5 + 0.5;
        const price = Math.round(basePrice * 100) / 100;

        // Sélectionner une devise aléatoire
        const currency =
          currencies[Math.floor(Math.random() * currencies.length)];

        // Sélectionner un état aléatoire
        const cardState =
          cardStates[Math.floor(Math.random() * cardStates.length)];

        // Quantité disponible entre 1 et 5
        const quantityAvailable = Math.floor(Math.random() * 5) + 1;

        // Créer le listing
        const listing = this.listingRepository.create({
          seller: randomSeller,
          pokemonCard: card,
          price: price,
          currency: currency,
          quantityAvailable: quantityAvailable,
          cardState: cardState,
          expiresAt: undefined
        });

        listingsToCreate.push(listing);

        // Créer seulement 1-2 entrées d'historique au lieu de 1-5
        const historicalEntries = Math.floor(Math.random() * 2) + 1;

        for (let j = 0; j < historicalEntries; j++) {
          const daysAgo = Math.floor(Math.random() * 90);
          const recordedAt = new Date(
            now.getTime() - daysAgo * 24 * 60 * 60 * 1000
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
            recordedAt: recordedAt
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
          recordedAt: now
        });
        priceHistoriesToCreate.push(currentPriceHistory);
      }
    }

    // Sauvegarder en batch (par lots de 500 pour éviter les problèmes de mémoire)
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
      `✅ ${savedCount} listings créés pour ${cards.length} cartes avec ${sellers.length} vendeurs`
    );
  }

  async seedDeckFormats() {
    const formatsData = [
      { type: 'Standard', startDate: '2023-07-01', endDate: '2024-06-30' },
      { type: 'Extended', startDate: '2023-07-01', endDate: '2024-06-30' }
    ];

    const formats: DeckFormat[] = [];

    for (const f of formatsData) {
      let format = await this.formatRepository.findOne({
        where: { type: f.type }
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
        isPublic: isPublic
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
            role: DeckCardRole.main
          })
        );
      }
    }
    await this.deckCardRepository.save(deckCards);
  }

  /**
   * Seed card events to simulate user interactions
   * Génère des événements réalistes (view, search, favorite, add_to_cart) pour certaines cartes
   */
  async seedCardEvents() {
    console.log('🌱 Starting card events seed...');
    const users = await this.userRepository.find();
    const cards = await this.pokemonCardRepository.find({ take: 200 }); // Limiter à 200 cartes

    console.log(`Found ${users.length} users and ${cards.length} cards`);

    if (users.length < 1 || cards.length < 1) {
      console.log(
        "Pas assez d'utilisateurs ou de cartes pour créer des événements"
      );
      return;
    }

    const eventsToCreate: CardEvent[] = [];
    const now = new Date();

    // Pour chaque carte, générer des événements sur les 90 derniers jours
    for (const card of cards) {
      // Nombre d'événements pour cette carte (entre 10 et 500)
      const eventCount = Math.floor(Math.random() * 491) + 10;

      for (let i = 0; i < eventCount; i++) {
        // Date aléatoire dans les 90 derniers jours
        const daysAgo = Math.random() * 90;
        const createdAt = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000
        );

        // Probabilité différente pour chaque type d'événement
        const rand = Math.random();
        let eventType: CardEventType;
        if (rand < 0.6) {
          // 60% de views
          eventType = CardEventType.VIEW;
        } else if (rand < 0.8) {
          // 20% de searches
          eventType = CardEventType.SEARCH;
        } else if (rand < 0.95) {
          // 15% de favorites
          eventType = CardEventType.FAVORITE;
        } else {
          // 5% de add_to_cart
          eventType = CardEventType.ADD_TO_CART;
        }

        // Sélectionner un utilisateur aléatoire (ou null pour les événements anonymes)
        const randomUser =
          Math.random() > 0.3
            ? users[Math.floor(Math.random() * users.length)]
            : null;

        // Générer un sessionId réaliste
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Générer un contexte pour les recherches
        const context =
          eventType === CardEventType.SEARCH
            ? {
                searchQuery:
                  card.name?.substring(0, Math.floor(Math.random() * 10) + 3) ||
                  'pokemon',
                resultsCount: Math.floor(Math.random() * 100) + 1
              }
            : eventType === CardEventType.ADD_TO_CART
              ? {
                  listingId: Math.floor(Math.random() * 1000) + 1
                }
              : undefined;

        const event = this.cardEventRepository.create({
          card,
          eventType,
          user: randomUser || undefined,
          sessionId: randomUser ? undefined : sessionId,
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          context,
          createdAt
        });

        eventsToCreate.push(event);
      }
    }

    // Sauvegarder en batch (par lots de 1000)
    const batchSize = 1000;
    let savedCount = 0;

    console.log(
      `Creating ${eventsToCreate.length} events in batches of ${batchSize}...`
    );

    for (let i = 0; i < eventsToCreate.length; i += batchSize) {
      const batch = eventsToCreate.slice(i, i + batchSize);
      try {
        await this.cardEventRepository.save(batch);
        savedCount += batch.length;
        console.log(
          `Saved batch ${Math.floor(i / batchSize) + 1}: ${savedCount}/${eventsToCreate.length} events`
        );
      } catch (error) {
        console.error(
          `Error saving batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        throw error;
      }
    }

    console.log(
      `✅ ${savedCount} événements de cartes créés pour ${cards.length} cartes`
    );
  }

  /**
   * Seed card popularity metrics by aggregating events
   * Agrège les événements existants pour créer des métriques de popularité
   * Note: Cette méthode nécessite que seedCardEvents() ait été appelé avant
   */
  async seedCardPopularityMetrics() {
    console.log('🌱 Starting card popularity metrics seed...');
    const cards = await this.pokemonCardRepository.find({ take: 200 });
    const events = await this.cardEventRepository.find({
      relations: ['card']
    });

    console.log(`Found ${cards.length} cards and ${events.length} events`);

    if (cards.length === 0 || events.length === 0) {
      console.log(
        "Pas d'événements à agréger. Appelez seedCardEvents() d'abord."
      );
      return;
    }

    // Pré-filtrer les événements par carte pour éviter les recherches répétées
    const eventsByCardId = new Map<string, CardEvent[]>();
    events.forEach((event) => {
      const cardId = event.card.id;
      if (!eventsByCardId.has(cardId)) {
        eventsByCardId.set(cardId, []);
      }
      eventsByCardId.get(cardId)!.push(event);
    });

    // Récupérer tous les listings une seule fois
    const allListings = await this.listingRepository.find({
      relations: ['pokemonCard']
    });
    const listingsByCardId = new Map<string, Listing[]>();
    allListings.forEach((listing) => {
      const cardId = listing.pokemonCard.id;
      if (!listingsByCardId.has(cardId)) {
        listingsByCardId.set(cardId, []);
      }
      listingsByCardId.get(cardId)!.push(listing);
    });

    // Grouper les événements par carte et par jour
    const eventsByCardAndDate = new Map<string, Map<string, CardEvent[]>>();

    events.forEach((event) => {
      const cardId = event.card.id;
      const dateKey = event.createdAt.toISOString().split('T')[0];

      if (!eventsByCardAndDate.has(cardId)) {
        eventsByCardAndDate.set(cardId, new Map());
      }

      const cardEvents = eventsByCardAndDate.get(cardId)!;
      if (!cardEvents.has(dateKey)) {
        cardEvents.set(dateKey, []);
      }

      cardEvents.get(dateKey)!.push(event);
    });

    const metricsToCreate: CardPopularityMetrics[] = [];
    let processedCards = 0;
    const totalCards = eventsByCardAndDate.size;

    // Pour chaque carte et chaque jour avec événements
    for (const [cardId, dateEvents] of eventsByCardAndDate) {
      processedCards++;
      const card = cards.find((c) => c.id === cardId);
      if (!card) continue;

      const cardEvents = eventsByCardId.get(cardId) || [];
      const cardListings = listingsByCardId.get(cardId) || [];

      if (processedCards % 10 === 0) {
        console.log(
          `Processing card ${processedCards}/${totalCards} (${card.name || cardId})...`
        );
      }

      for (const [dateKey, dayEvents] of dateEvents) {
        const date = new Date(dateKey + 'T00:00:00.000Z');

        // Compter les événements par type pour ce jour
        const metrics = {
          views: 0,
          searches: 0,
          favorites: 0,
          addsToCart: 0,
          sales: 0
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

        // Filtrer les listings actifs pour cette date (utilise les listings pré-chargés)
        const activeListings = cardListings.filter(
          (l) => !l.expiresAt || new Date(l.expiresAt) > date
        );

        const prices = activeListings.map((l) =>
          parseFloat(l.price.toString())
        );
        const listingCount = activeListings.length;
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const avgPrice =
          prices.length > 0
            ? prices.reduce((a, b) => a + b, 0) / prices.length
            : null;

        // Calculer les scores en utilisant les événements pré-filtrés par carte
        const cutoff90Days = new Date(
          date.getTime() - 90 * 24 * 60 * 60 * 1000
        );
        const cutoff7Days = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
        const cutoff30Days = new Date(
          date.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        // Filtrer les événements pour les scores (une seule fois par carte/jour)
        const allEventsForCard = cardEvents.filter(
          (e) => e.createdAt >= cutoff90Days && e.createdAt <= date
        );

        const popularityScore = allEventsForCard.reduce((sum, e) => {
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

        // Pour le trend_score
        const recentEvents = cardEvents.filter(
          (e) => e.createdAt >= cutoff7Days && e.createdAt <= date
        );

        const baseEvents = cardEvents.filter(
          (e) => e.createdAt >= cutoff30Days && e.createdAt < cutoff7Days
        );

        const recentScore =
          recentEvents.reduce((sum, e) => {
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
          }, 0) / 7;

        const baseScore =
          baseEvents.reduce((sum, e) => {
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
          }, 0) / 23;

        const trendScore =
          baseScore === 0
            ? recentScore > 0
              ? 100
              : 0
            : ((recentScore - baseScore) / baseScore) * 100;

        const metric: CardPopularityMetrics =
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
            updatedAt: date
          } as DeepPartial<CardPopularityMetrics>);

        metricsToCreate.push(metric);
      }
    }

    // Sauvegarder en batch
    const batchSize = 500;
    let savedCount = 0;

    console.log(
      `Creating ${metricsToCreate.length} metrics in batches of ${batchSize}...`
    );

    for (let i = 0; i < metricsToCreate.length; i += batchSize) {
      const batch = metricsToCreate.slice(i, i + batchSize);
      try {
        await this.cardPopularityMetricsRepository.save(batch);
        savedCount += batch.length;
        console.log(
          `Saved batch ${Math.floor(i / batchSize) + 1}: ${savedCount}/${metricsToCreate.length} metrics`
        );
      } catch (error) {
        console.error(
          `Error saving batch ${Math.floor(i / batchSize) + 1}:`,
          error
        );
        throw error;
      }
    }

    console.log(
      `✅ ${savedCount} métriques de popularité créées pour ${eventsByCardAndDate.size} cartes`
    );
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
        match,
        ranking,
        tournament,
        player,
        article,
        pokemon_card,
        pokemon_set,
        pokemon_serie,
        "user"
      RESTART IDENTITY CASCADE;
    `);
  }
}
