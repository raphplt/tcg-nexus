/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { Currency } from 'src/common/enums/currency';
import { Deck } from 'src/deck/entities/deck.entity';
import { DeckCard } from 'src/deck-card/entities/deck-card.entity';
import { DeckCardRole } from 'src/common/enums/deckCardRole';
import { DeckFormat } from 'src/deck-format/entities/deck-format.entity';
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
    @InjectRepository(DeckFormat)
    private readonly formatRepository: Repository<DeckFormat>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(DeckCard)
    private readonly deckCardRepository: Repository<DeckCard>
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
        const serie = await this.pokemonSerieRepository.findOne({
          where: { id: setData.serie?.id }
        });

        if (serie) {
          const newSet = this.pokemonSetRepository.create({
            ...setData,
            serie
          });
          sets.push(newSet);
        }
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

    // Récupère le chemin du fichier zip
    const zipPath = path.resolve(__dirname, '../common/data/pokemons.zip');
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
        // Parse le contenu JSON
        if (typeof firstEntryContent !== 'string') {
          throw new Error('Invalid content type, expected a string');
        }
        const pokemonCards: any[] = JSON.parse(firstEntryContent);

        // Parcours de chaque carte du JSON
        for (const cardData of pokemonCards) {
          // Récupération de l'ID du set dans le JSON
          const setId = cardData.set?.id;
          if (!setId) {
            // console.warn(`Carte ${cardData.id} sans set défini.`);
            continue;
          }
          // Recherche du set correspondant en BDD
          const set = await this.pokemonSetRepository.findOne({
            where: { id: setId }
          });
          if (!set) {
            console.warn(
              `Set avec id ${setId} non trouvé pour la carte ${cardData.id}.`
            );
            continue;
          }
          // Supprime la propriété "set" du JSON et lui réassigne le set trouvé
          delete cardData.set;
          cardData.set = set;

          // Assigner l'id à tcgDexId et supprimer l'id de cardData
          cardData.tcgDexId = cardData.id;
          delete cardData.id;

          // Nettoyer le nom de la carte pour retirer les caractères spéciaux
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

          // Optionnel : Nettoyage de l'objet variants pour retirer d'éventuels attributs non désirés
          if (cardData.variants && cardData.variants.wPromo !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { wPromo, ...validVariants } = cardData.variants;
            cardData.variants = validVariants;
          }

          // Création de l'entité PokemonCard à partir des données
          const card = this.pokemonCardRepository.create(
            cardData as DeepPartial<PokemonCard>
          );
          cards.push(card);
        }

        // Sauvegarde des cartes en base
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
        collections: [],
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
        collections: [],
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
        collections: [],
        collections: []
      }
    ];
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
    }
    return users;
  }

  /**
   * Seed test tournaments with related entities
   */
  async seedTournaments() {
    // Crée quelques joueurs (réutilise si déjà existants)
    const players: Player[] = [];
    for (let i = 1; i <= 4; i++) {
      const name = `Player${i}`;
      let player = await this.playerRepository.findOne({ where: { name } });
      if (!player) {
        player = this.playerRepository.create({ name });
        await this.playerRepository.save(player);
      }
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
   */
  async seedListings() {
    // Récupère les 3 premiers utilisateurs et 3 premières cartes Pokémon
    const sellers = await this.userRepository.find({ take: 3 });
    const cards = await this.pokemonCardRepository.find({ take: 3 });
    if (sellers.length < 1 || cards.length < 1) return;

    const listingsSeed = [
      // Seller 1, Card 1
      {
        seller: sellers[0],
        pokemonCard: cards[0],
        price: 5.99,
        currency: Currency.EUR,
        quantityAvailable: 2,
        cardState: CardState.NM,
        expiresAt: undefined
      },
      {
        seller: sellers[0],
        pokemonCard: cards[1],
        price: 3.5,
        currency: Currency.USD,
        quantityAvailable: 1,
        cardState: CardState.EX,
        expiresAt: undefined
      },
      {
        seller: sellers[0],
        pokemonCard: cards[2],
        price: 7.0,
        currency: Currency.GBP,
        quantityAvailable: 3,
        cardState: CardState.GD,
        expiresAt: undefined
      },
      // Seller 2, Card 1
      {
        seller: sellers[1],
        pokemonCard: cards[0],
        price: 6.5,
        currency: Currency.EUR,
        quantityAvailable: 1,
        cardState: CardState.LP,
        expiresAt: undefined
      },
      {
        seller: sellers[1],
        pokemonCard: cards[1],
        price: 2.99,
        currency: Currency.USD,
        quantityAvailable: 2,
        cardState: CardState.PL,
        expiresAt: undefined
      },
      {
        seller: sellers[1],
        pokemonCard: cards[2],
        price: 8.25,
        currency: Currency.GBP,
        quantityAvailable: 1,
        cardState: CardState.Poor,
        expiresAt: undefined
      },
      // Seller 3, Card 1
      {
        seller: sellers[2],
        pokemonCard: cards[0],
        price: 4.75,
        currency: Currency.EUR,
        quantityAvailable: 1,
        cardState: CardState.EX,
        expiresAt: undefined
      },
      {
        seller: sellers[2],
        pokemonCard: cards[1],
        price: 5.0,
        currency: Currency.USD,
        quantityAvailable: 2,
        cardState: CardState.NM,
        expiresAt: undefined
      },
      {
        seller: sellers[2],
        pokemonCard: cards[2],
        price: 9.99,
        currency: Currency.GBP,
        quantityAvailable: 1,
        cardState: CardState.LP,
        expiresAt: undefined
      },
      // Un extra pour la diversité
      {
        seller: sellers[0],
        pokemonCard: cards[0],
        price: 10.0,
        currency: Currency.EUR,
        quantityAvailable: 1,
        cardState: CardState.Poor,
        expiresAt: undefined
      }
    ];

    for (const listing of listingsSeed) {
      const exists = await this.listingRepository.findOne({
        where: {
          seller: { id: listing.seller.id },
          pokemonCard: { id: listing.pokemonCard.id },
          price: listing.price
        },
        relations: ['seller', 'pokemonCard']
      });
      if (!exists) {
        await this.listingRepository.save(
          this.listingRepository.create(listing)
        );
      }
    }
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
    const user = await this.userRepository.findOne({
      where: { email: 'test1@test.com' }
    });
    if (!user) return;

    const formats = await this.seedDeckFormats();
    if (formats.length === 0) return;

    const cards = await this.pokemonCardRepository.find({ take: 2 });
    if (cards.length < 2) return;

    const deck1 = this.deckRepository.create({
      name: 'Deck Demo 1',
      user,
      format: formats[0]
    });
    const deck2 = this.deckRepository.create({
      name: 'Deck Demo 2',
      user,
      format: formats[1]
    });
    await this.deckRepository.save([deck1, deck2]);

    const deckCards: DeckCard[] = [
      this.deckCardRepository.create({
        deck: deck1,
        card: cards[0],
        qty: 2,
        role: DeckCardRole.main
      }),
      this.deckCardRepository.create({
        deck: deck1,
        card: cards[1],
        qty: 1,
        role: DeckCardRole.main
      }),
      this.deckCardRepository.create({
        deck: deck2,
        card: cards[0],
        qty: 1,
        role: DeckCardRole.main
      }),
      this.deckCardRepository.create({
        deck: deck2,
        card: cards[1],
        qty: 2,
        role: DeckCardRole.main
      })
    ];

    await this.deckCardRepository.save(deckCards);
  }

  /**
   * Truncate all tables before seeding (Postgres version)
   */
  async truncateTables() {
    await this.userRepository.query(`
      TRUNCATE TABLE
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
