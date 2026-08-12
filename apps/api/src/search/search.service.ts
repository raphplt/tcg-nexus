import { CatalogLocalizationService } from "src/card/catalog-localization.service";
import { applyCardSearch, cardNameMatchesSql } from "../card/card-search";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { CardGame } from "../common/enums/cardGame";
import { Listing } from "../marketplace/entities/listing.entity";
import { Player } from "../player/entities/player.entity";
import { Tournament } from "../tournament/entities/tournament.entity";
import { User } from "../user/entities/user.entity";
import {
  GlobalSearchDto,
  GlobalSearchResult,
  SearchResultItem,
} from "./dto/global-search.dto";
import {
  SuggestionDetailItem,
  SuggestionPreviewItem,
  SuggestionsDetailResult,
  SuggestionsPreviewResult,
} from "./dto/suggestions.dto";

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    private readonly localization: CatalogLocalizationService,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async globalSearch(searchDto: GlobalSearchDto): Promise<GlobalSearchResult> {
    const startTime = Date.now();
    const {
      query,
      type = "all",
      page = 1,
      limit = 10,
      sortBy = "relevance",
      sortOrder = "DESC",
    } = searchDto;

    if (!query || query.trim().length < 2) {
      return {
        results: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        query,
        searchTime: Date.now() - startTime,
      };
    }

    const searchTerm = query.trim();
    const offset = (page - 1) * limit;
    const results: SearchResultItem[] = [];

    // Search Pokémon cards
    if (type === "all" || type === "cards") {
      const cardResults = await this.searchPokemonCards(searchTerm, limit);
      results.push(...cardResults);
    }

    // Search tournaments
    if (type === "all" || type === "tournaments") {
      const tournamentResults = await this.searchTournaments(searchTerm, limit);
      results.push(...tournamentResults);
    }

    // Search players
    if (type === "all" || type === "players") {
      const playerResults = await this.searchPlayers(searchTerm, limit);
      results.push(...playerResults);
    }

    // Search marketplace listings
    if (type === "all" || type === "marketplace") {
      const marketplaceResults = await this.searchMarketplace(
        searchTerm,
        limit,
      );
      results.push(...marketplaceResults);
    }

    // Sort by relevance score
    const scoredResults = this.calculateRelevanceScores(results, searchTerm);
    const sortedResults = this.sortResults(scoredResults, sortBy, sortOrder);

    // Paginate results
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    const totalPages = Math.ceil(sortedResults.length / limit);

    return {
      results: paginatedResults,
      total: sortedResults.length,
      page,
      limit,
      totalPages,
      query,
      searchTime: Date.now() - startTime,
    };
  }

  private async searchPokemonCards(
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon });

    const cards = await applyCardSearch(qb, query).limit(limit).getMany();

    // Flattening result name into `title` prevents interceptor recognition; resolve labels directly here
    await this.localization.resolveLabels(cards);

    return cards.map((card) => ({
      id: card.id,
      type: "card" as const,
      title: card.name || "Carte sans nom",
      description: `${card.rarity || "Rareté inconnue"} • ${card.set?.name || "Set inconnu"}`,
      url: `/pokemon/${card.id}`,
      image: card.image,
      metadata: {
        rarity: card.rarity,
        set: card.set?.name,
        illustrator: card.illustrator,
        category: card.pokemonDetails?.category ?? card.category,
        hp: card.pokemonDetails?.hp,
        types: card.pokemonDetails?.types,
      },
    }));
  }

  private async searchTournaments(
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const tournaments = await this.tournamentRepository
      .createQueryBuilder("tournament")
      .leftJoinAndSelect("tournament.players", "players")
      .where(
        "(tournament.name ILIKE :query OR tournament.description ILIKE :query OR tournament.location ILIKE :query)",
        { query: `%${query}%` },
      )
      .andWhere("tournament.isPublic = :isPublic", { isPublic: true })
      .limit(limit)
      .getMany();

    return tournaments.map((tournament) => ({
      id: tournament.id,
      type: "tournament" as const,
      title: tournament.name,
      description: `${tournament.location || "Lieu non spécifié"} • ${tournament.status} • ${tournament.players?.length || 0} joueurs`,
      url: `/tournaments/${tournament.id}`,
      metadata: {
        status: tournament.status,
        type: tournament.type,
        location: tournament.location,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        playerCount: tournament.players?.length || 0,
        isPublic: tournament.isPublic,
      },
    }));
  }

  private async searchPlayers(
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const players = await this.playerRepository
      .createQueryBuilder("player")
      .leftJoinAndSelect("player.user", "user")
      .leftJoinAndSelect("player.tournaments", "tournaments")
      .where("user.firstName ILIKE :query", { query: `%${query}%` })
      .orWhere("user.lastName ILIKE :query", { query: `%${query}%` })
      .orWhere("user.email ILIKE :query", { query: `%${query}%` })
      .limit(limit)
      .getMany();

    return players.map((player) => ({
      id: player.id,
      type: "player" as const,
      title:
        `${player.user?.firstName || ""} ${player.user?.lastName || ""}`.trim(),
      description: `${player.user?.email || ""} • ${player.tournaments?.length || 0} tournois`,
      url: `/players/${player.id}`,
      metadata: {
        userId: player.user?.id,
        email: player.user?.email,
        tournamentCount: player.tournaments?.length || 0,
      },
    }));
  }

  private async searchMarketplace(
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const listings = await this.listingRepository
      .createQueryBuilder("listing")
      .leftJoinAndSelect("listing.pokemonCard", "pokemonCard")
      .leftJoinAndSelect("listing.seller", "seller")
      .leftJoinAndSelect("pokemonCard.set", "set")
      .where(cardNameMatchesSql("pokemonCard", "query"), {
        query: `%${query.toLowerCase()}%`,
      })
      .orWhere("listing.description ILIKE :query")
      .orWhere("seller.firstName ILIKE :query")
      .orWhere("seller.lastName ILIKE :query")
      .limit(limit)
      .getMany();

    // Card labels are flattened into `title`, out of reach of the interceptor.
    await this.localization.resolveLabels(listings);

    return listings
      .filter((listing) => listing.pokemonCard != null)
      .map((listing) => {
        const card = listing.pokemonCard!;
        return {
          id: listing.id,
          type: "marketplace" as const,
          title: `${card.name} - ${listing.price} ${listing.currency}`,
          description: `${listing.cardState} • ${listing.seller.firstName} ${listing.seller.lastName} • ${listing.quantityAvailable} disponible(s)`,
          url: `/marketplace/${listing.id}`,
          image: card.image,
          metadata: {
            price: listing.price,
            currency: listing.currency,
            cardState: listing.cardState,
            quantityAvailable: listing.quantityAvailable,
            seller: {
              id: listing.seller.id,
              name: `${listing.seller.firstName} ${listing.seller.lastName}`,
            },
            pokemonCard: {
              id: card.id,
              name: card.name,
              rarity: card.rarity,
            },
          },
        };
      });
  }

  private calculateRelevanceScores(
    results: SearchResultItem[],
    query: string,
  ): SearchResultItem[] {
    const queryLower = query.toLowerCase();

    return results.map((result) => {
      let score = 0;
      const titleLower = result.title.toLowerCase();
      const descriptionLower = result.description.toLowerCase();

      // Score based on exact title match
      if (titleLower === queryLower) {
        score += 100;
      } else if (titleLower.startsWith(queryLower)) {
        score += 80;
      } else if (titleLower.includes(queryLower)) {
        score += 60;
      }

      // Score based on description match
      if (descriptionLower.includes(queryLower)) {
        score += 20;
      }

      // Bonus for partial word matches
      const queryWords = queryLower.split(" ");
      const titleWords = titleLower.split(" ");
      const descriptionWords = descriptionLower.split(" ");

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
        relevanceScore: score,
      };
    });
  }

  private sortResults(
    results: SearchResultItem[],
    sortBy: string = "relevance",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): SearchResultItem[] {
    return results.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "type") {
        comparison = a.type.localeCompare(b.type);
      } else {
        comparison = (a.relevanceScore || 0) - (b.relevanceScore || 0);
      }

      return sortOrder === "ASC" ? comparison : -comparison;
    });
  }

  /**
   * Retrieves search suggestions (legacy method).
   */
  async getSearchSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const suggestions: string[] = [];
    const searchTerm = query.trim();

    // Suggestions derived from popular card names
    const popularCards = await this.pokemonCardRepository
      .createQueryBuilder("card")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere("card.name ILIKE :query", { query: `%${searchTerm}%` })
      .orderBy("card.name", "ASC")
      .limit(limit)
      .getMany();

    suggestions.push(
      ...popularCards
        .map((card) => card.name)
        .filter((name): name is string => Boolean(name)),
    );

    // Suggestions derived from recent public tournaments
    const recentTournaments = await this.tournamentRepository
      .createQueryBuilder("tournament")
      .where("tournament.name ILIKE :query", { query: `%${searchTerm}%` })
      .andWhere("tournament.isPublic = :isPublic", { isPublic: true })
      .orderBy("tournament.createdAt", "DESC")
      .limit(limit)
      .getMany();

    suggestions.push(...recentTournaments.map((tournament) => tournament.name));

    // Remove duplicates and enforce limit
    return [...new Set(suggestions)].slice(0, limit);
  }

  /**
   * Retrieves preview search suggestions with basic fields.
   */
  async getSuggestionsPreview(
    query: string,
    limit: number = 8,
  ): Promise<SuggestionsPreviewResult> {
    if (!query || query.trim().length < 2) {
      return {
        suggestions: [],
        total: 0,
        query,
      };
    }

    const suggestions: SuggestionPreviewItem[] = [];
    const searchTerm = query.trim();

    // Suggestions derived from Pokémon cards
    const cards = await this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere("card.name ILIKE :query", { query: `%${searchTerm}%` })
      .orderBy("card.name", "ASC")
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...cards.map((card) => ({
        id: card.id,
        type: "card" as const,
        title: card.name || "Carte sans nom",
        subtitle: card.set?.name || "Set inconnu",
        image: card.image,
      })),
    );

    // Suggestions derived from tournaments
    const tournaments = await this.tournamentRepository
      .createQueryBuilder("tournament")
      .where("tournament.name ILIKE :query", { query: `%${searchTerm}%` })
      .andWhere("tournament.isPublic = :isPublic", { isPublic: true })
      .orderBy("tournament.createdAt", "DESC")
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: "tournament" as const,
        title: tournament.name,
        subtitle: tournament.location || "Lieu non spécifié",
      })),
    );

    // Suggestions derived from registered players
    const players = await this.playerRepository
      .createQueryBuilder("player")
      .leftJoinAndSelect("player.user", "user")
      .where("user.firstName ILIKE :query", { query: `%${searchTerm}%` })
      .orWhere("user.lastName ILIKE :query", { query: `%${searchTerm}%` })
      .orderBy("user.firstName", "ASC")
      .limit(Math.ceil(limit / 4))
      .getMany();

    suggestions.push(
      ...players.map((player) => ({
        id: player.id,
        type: "player" as const,
        title:
          `${player.user?.firstName || ""} ${player.user?.lastName || ""}`.trim(),
        subtitle: player.user?.email || "",
      })),
    );

    // Omit duplicates and enforce slice limit
    const uniqueSuggestions = suggestions
      .filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.id === item.id && t.type === item.type),
      )
      .slice(0, limit);

    return {
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length,
      query,
    };
  }

  /**
   * Retrieves detailed search suggestions with full metadata.
   */
  async getSuggestionsDetail(
    query: string,
    limit: number = 5,
  ): Promise<SuggestionsDetailResult> {
    if (!query || query.trim().length < 2) {
      return {
        suggestions: [],
        total: 0,
        query,
      };
    }

    const suggestions: SuggestionDetailItem[] = [];
    const searchTerm = query.trim();

    // Detailed suggestions derived from Pokémon cards
    const cards = await this.pokemonCardRepository
      .createQueryBuilder("card")
      .leftJoinAndSelect("card.set", "set")
      .leftJoinAndSelect("card.pokemonDetails", "pokemonDetails")
      .where("card.game = :game", { game: CardGame.Pokemon })
      .andWhere("card.name ILIKE :query", { query: `%${searchTerm}%` })
      .orderBy("card.name", "ASC")
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...cards.map((card) => ({
        id: card.id,
        type: "card" as const,
        title: card.name || "Carte sans nom",
        description: `${card.rarity || "Rareté inconnue"} • ${card.set?.name || "Set inconnu"}`,
        url: `/pokemon/${card.id}`,
        image: card.image,
        metadata: {
          rarity: card.rarity,
          set: card.set?.name,
          illustrator: card.illustrator,
          category: card.pokemonDetails?.category ?? card.category,
          hp: card.pokemonDetails?.hp,
          types: card.pokemonDetails?.types,
        },
      })),
    );

    // Detailed suggestions derived from tournaments
    const tournaments = await this.tournamentRepository
      .createQueryBuilder("tournament")
      .leftJoinAndSelect("tournament.players", "players")
      .where("tournament.name ILIKE :query", { query: `%${searchTerm}%` })
      .andWhere("tournament.isPublic = :isPublic", { isPublic: true })
      .orderBy("tournament.createdAt", "DESC")
      .limit(Math.ceil(limit / 2))
      .getMany();

    suggestions.push(
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: "tournament" as const,
        title: tournament.name,
        description: `${tournament.location || "Lieu non spécifié"} • ${tournament.status} • ${tournament.players?.length || 0} joueurs`,
        url: `/tournaments/${tournament.id}`,
        metadata: {
          status: tournament.status,
          type: tournament.type,
          location: tournament.location,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          playerCount: tournament.players?.length || 0,
          isPublic: tournament.isPublic,
        },
      })),
    );

    const uniqueSuggestions = suggestions
      .filter(
        (item, index, self) =>
          index ===
          self.findIndex((t) => t.id === item.id && t.type === item.type),
      )
      .slice(0, limit);

    return {
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length,
      query,
    };
  }
}
