import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Tournament } from '../tournament/entities/tournament.entity';
import { Player } from '../player/entities/player.entity';
import { Listing } from '../marketplace/entities/listing.entity';
import { User } from '../user/entities/user.entity';
import {
  GlobalSearchDto,
  SearchResultItem,
  GlobalSearchResult
} from './dto/global-search.dto';
import {
  SuggestionsPreviewResult,
  SuggestionsDetailResult,
  SuggestionPreviewItem,
  SuggestionDetailItem
} from './dto/suggestions.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepository: Repository<PokemonCard>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async globalSearch(searchDto: GlobalSearchDto): Promise<GlobalSearchResult> {
    const startTime = Date.now();
    const {
      query,
      type = 'all',
      page = 1,
      limit = 10,
      sortBy = 'relevance',
      sortOrder = 'DESC'
    } = searchDto;

    if (!query || query.trim().length < 2) {
      return {
        results: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        query,
        searchTime: Date.now() - startTime
      };
    }

    const searchTerm = query.trim();
    const offset = (page - 1) * limit;
    const results: SearchResultItem[] = [];

    // Recherche dans les cartes Pokémon
    if (type === 'all' || type === 'cards') {
      const cardResults = await this.searchPokemonCards(searchTerm, limit);
      results.push(...cardResults);
    }

    // Recherche dans les tournois
    if (type === 'all' || type === 'tournaments') {
      const tournamentResults = await this.searchTournaments(searchTerm, limit);
      results.push(...tournamentResults);
    }

    // Recherche dans les joueurs
    if (type === 'all' || type === 'players') {
      const playerResults = await this.searchPlayers(searchTerm, limit);
      results.push(...playerResults);
    }

    // Recherche dans le marketplace
    if (type === 'all' || type === 'marketplace') {
      const marketplaceResults = await this.searchMarketplace(
        searchTerm,
        limit
      );
      results.push(...marketplaceResults);
    }

    // Calcul du score de pertinence et tri
    const scoredResults = this.calculateRelevanceScores(results, searchTerm);
    const sortedResults = this.sortResults(scoredResults, sortBy, sortOrder);

    // Pagination des résultats
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    const totalPages = Math.ceil(sortedResults.length / limit);

    return {
      results: paginatedResults,
      total: sortedResults.length,
      page,
      limit,
      totalPages,
      query,
      searchTime: Date.now() - startTime
    };
  }

  private async searchPokemonCards(
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const cards = await this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .where('card.name ILIKE :query', { query: `%${query}%` })
      .orWhere('card.rarity ILIKE :query', { query: `%${query}%` })
      .orWhere('card.description ILIKE :query', { query: `%${query}%` })
      .orWhere('set.name ILIKE :query', { query: `%${query}%` })
      .orWhere('card.illustrator ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();

    return cards.map((card) => ({
      id: card.id,
      type: 'card' as const,
      title: card.name || 'Carte sans nom',
      description: `${card.rarity || 'Rareté inconnue'} • ${card.set?.name || 'Set inconnu'}`,
      url: `/pokemon/${card.id}`,
      image: card.image,
      metadata: {
        rarity: card.rarity,
        set: card.set?.name,
        illustrator: card.illustrator,
        category: card.category,
        hp: card.hp,
        types: card.types
      }
    }));
  }

  private async searchTournaments(
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const tournaments = await this.tournamentRepository
      .createQueryBuilder('tournament')
      .leftJoinAndSelect('tournament.players', 'players')
      .where('tournament.name ILIKE :query', { query: `%${query}%` })
      .orWhere('tournament.description ILIKE :query', { query: `%${query}%` })
      .orWhere('tournament.location ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();

    return tournaments.map((tournament) => ({
      id: tournament.id,
      type: 'tournament' as const,
      title: tournament.name,
      description: `${tournament.location || 'Lieu non spécifié'} • ${tournament.status} • ${tournament.players?.length || 0} joueurs`,
      url: `/tournaments/${tournament.id}`,
      metadata: {
        status: tournament.status,
        type: tournament.type,
        location: tournament.location,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        playerCount: tournament.players?.length || 0,
        isPublic: tournament.isPublic
      }
    }));
  }

  private async searchPlayers(
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const players = await this.playerRepository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.user', 'user')
      .leftJoinAndSelect('player.tournaments', 'tournaments')
      .where('player.name ILIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.email ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();

    return players.map((player) => ({
      id: player.id,
      type: 'player' as const,
      title: player.name,
      description: `${player.user?.firstName || ''} ${player.user?.lastName || ''} • ${player.tournaments?.length || 0} tournois`,
      url: `/players/${player.id}`,
      metadata: {
        userId: player.user?.id,
        email: player.user?.email,
        tournamentCount: player.tournaments?.length || 0
      }
    }));
  }

  private async searchMarketplace(
    query: string,
    limit: number
  ): Promise<SearchResultItem[]> {
    const listings = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('pokemonCard.set', 'set')
      .where('pokemonCard.name ILIKE :query', { query: `%${query}%` })
      .orWhere('listing.description ILIKE :query', { query: `%${query}%` })
      .orWhere('seller.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('seller.lastName ILIKE :query', { query: `%${query}%` })
      .limit(limit)
      .getMany();

    return listings.map((listing) => ({
      id: listing.id,
      type: 'marketplace' as const,
      title: `${listing.pokemonCard.name} - ${listing.price} ${listing.currency}`,
      description: `${listing.cardState} • ${listing.seller.firstName} ${listing.seller.lastName} • ${listing.quantityAvailable} disponible(s)`,
      url: `/marketplace/${listing.id}`,
      image: listing.pokemonCard.image,
      metadata: {
        price: listing.price,
        currency: listing.currency,
        cardState: listing.cardState,
        quantityAvailable: listing.quantityAvailable,
        seller: {
          id: listing.seller.id,
          name: `${listing.seller.firstName} ${listing.seller.lastName}`
        },
        pokemonCard: {
          id: listing.pokemonCard.id,
          name: listing.pokemonCard.name,
          rarity: listing.pokemonCard.rarity
        }
      }
    }));
  }

  private calculateRelevanceScores(
    results: SearchResultItem[],
    query: string
  ): SearchResultItem[] {
    const queryLower = query.toLowerCase();

    return results.map((result) => {
      let score = 0;
      const titleLower = result.title.toLowerCase();
      const descriptionLower = result.description.toLowerCase();

      // Score basé sur la correspondance exacte dans le titre
      if (titleLower === queryLower) {
        score += 100;
      } else if (titleLower.startsWith(queryLower)) {
        score += 80;
      } else if (titleLower.includes(queryLower)) {
        score += 60;
      }

      // Score basé sur la correspondance dans la description
      if (descriptionLower.includes(queryLower)) {
        score += 20;
      }

      // Bonus pour les correspondances partielles
      const queryWords = queryLower.split(' ');
      const titleWords = titleLower.split(' ');
      const descriptionWords = descriptionLower.split(' ');

      queryWords.forEach((queryWord) => {
        if (titleWords.some((word) => word.includes(queryWord))) {
          score += 10;
        }
        if (descriptionWords.some((word) => word.includes(queryWord))) {
          score += 5;
        }
      });

      return {
        ...result,
        relevanceScore: score
      };
    });
  }

  private sortResults(
    results: SearchResultItem[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC'
  ): SearchResultItem[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      }

      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }

  // Méthode pour obtenir des suggestions de recherche (legacy)
  async getSearchSuggestions(
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const suggestions: string[] = [];
    const searchTerm = query.trim();

    // Suggestions basées sur les noms de cartes populaires
    const popularCards = await this.pokemonCardRepository
      .createQueryBuilder('card')
      .where('card.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('card.name', 'ASC')
      .limit(limit)
      .getMany();

    suggestions.push(...popularCards.map((card) => card.name));

    // Suggestions basées sur les tournois récents
    const recentTournaments = await this.tournamentRepository
      .createQueryBuilder('tournament')
      .where('tournament.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('tournament.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    suggestions.push(...recentTournaments.map((tournament) => tournament.name));

    // Supprimer les doublons et limiter
    return [...new Set(suggestions)].slice(0, limit);
  }

  // Méthode pour obtenir des suggestions preview (infos essentielles)
  async getSuggestionsPreview(
    query: string,
    limit: number = 8
  ): Promise<SuggestionsPreviewResult> {
    if (!query || query.trim().length < 2) {
      return {
        suggestions: [],
        total: 0,
        query
      };
    }

    const suggestions: SuggestionPreviewItem[] = [];
    const searchTerm = query.trim();

    // Suggestions basées sur les cartes Pokémon
    const cards = await this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .where('card.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('card.name', 'ASC')
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...cards.map((card) => ({
        id: card.id,
        type: 'card' as const,
        title: card.name || 'Carte sans nom',
        subtitle: card.set?.name || 'Set inconnu',
        image: card.image
      }))
    );

    // Suggestions basées sur les tournois
    const tournaments = await this.tournamentRepository
      .createQueryBuilder('tournament')
      .where('tournament.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('tournament.createdAt', 'DESC')
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: 'tournament' as const,
        title: tournament.name,
        subtitle: tournament.location || 'Lieu non spécifié'
      }))
    );

    // Suggestions basées sur les joueurs
    const players = await this.playerRepository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.user', 'user')
      .where('player.name ILIKE :query', { query: `%${searchTerm}%` })
      .orWhere('user.firstName ILIKE :query', { query: `%${searchTerm}%` })
      .orWhere('user.lastName ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('player.name', 'ASC')
      .limit(Math.ceil(limit / 4))
      .getMany();

    suggestions.push(
      ...players.map((player) => ({
        id: player.id,
        type: 'player' as const,
        title: player.name,
        subtitle:
          `${player.user?.firstName || ''} ${player.user?.lastName || ''}`.trim()
      }))
    );

    // Supprimer les doublons et limiter
    const uniqueSuggestions = suggestions
      .filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.id === item.id && t.type === item.type)
      )
      .slice(0, limit);

    return {
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length,
      query
    };
  }

  // Méthode pour obtenir des suggestions détaillées
  async getSuggestionsDetail(
    query: string,
    limit: number = 5
  ): Promise<SuggestionsDetailResult> {
    if (!query || query.trim().length < 2) {
      return {
        suggestions: [],
        total: 0,
        query
      };
    }

    const suggestions: SuggestionDetailItem[] = [];
    const searchTerm = query.trim();

    // Suggestions basées sur les cartes Pokémon avec détails
    const cards = await this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .where('card.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('card.name', 'ASC')
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...cards.map((card) => ({
        id: card.id,
        type: 'card' as const,
        title: card.name || 'Carte sans nom',
        description: `${card.rarity || 'Rareté inconnue'} • ${card.set?.name || 'Set inconnu'}`,
        url: `/pokemon/${card.id}`,
        image: card.image,
        metadata: {
          rarity: card.rarity,
          set: card.set?.name,
          illustrator: card.illustrator,
          category: card.category,
          hp: card.hp,
          types: card.types
        }
      }))
    );

    // Suggestions basées sur les tournois avec détails
    const tournaments = await this.tournamentRepository
      .createQueryBuilder('tournament')
      .leftJoinAndSelect('tournament.players', 'players')
      .where('tournament.name ILIKE :query', { query: `%${searchTerm}%` })
      .orderBy('tournament.createdAt', 'DESC')
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: 'tournament' as const,
        title: tournament.name,
        description: `${tournament.location || 'Lieu non spécifié'} • ${tournament.status} • ${tournament.players?.length || 0} joueurs`,
        url: `/tournaments/${tournament.id}`,
        metadata: {
          status: tournament.status,
          type: tournament.type,
          location: tournament.location,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          playerCount: tournament.players?.length || 0,
          isPublic: tournament.isPublic
        }
      }))
    );

    // Supprimer les doublons et limiter
    const uniqueSuggestions = suggestions
      .filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.id === item.id && t.type === item.type)
      )
      .slice(0, limit);

    return {
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length,
      query
    };
  }
}
