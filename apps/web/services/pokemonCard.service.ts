import api from "../utils/fetch";
import type { PokemonCardType, PokemonSerieType, PokemonSetType } from "../types/cardPokemon";
import type { PaginatedResult, PaginationParams } from "../types/pagination";
import { CollectionItemType } from "@/types/collection";
import { PokemonRarity } from "../types/enums/pokemonCardsType";

export const pokemonCardService = {
  async getPaginated(
    params: PaginationParams = {},
  ): Promise<PaginatedResult<PokemonCardType>> {
    const { page = 1, limit = 10 } = params;
    const response = await api.get<PaginatedResult<PokemonCardType>>(
      "/pokemon-card/paginated",
      {
        params: { page, limit },
      },
    );
    return response.data;
  },

  async getAll(): Promise<PokemonCardType[]> {
    const response = await api.get<PokemonCardType[]>("/pokemon-card");
    return response.data;
  },

  async getById(id: string): Promise<PokemonCardType> {
    const response = await api.get<PokemonCardType>(`/pokemon-card/${id}`);
    return response.data;
  },

  async search(query: string): Promise<PokemonCardType[]> {
    const response = await api.get<PokemonCardType[]>(
      `/pokemon-card/search/${query}`,
    );
    return response.data;
  },

  async getRandom(serieId?: string, rarity?: PokemonRarity, set?: string): Promise<PokemonCardType> {
  console.log("Fetching random card with serieId:", serieId, "and rarity:", rarity, "and set:", set);

  const params: Record<string, string> = {};
  if (serieId) params.serieId = serieId;
  if (rarity) params.rarity = rarity;
  if (set) params.set = set;

  const response = await api.get<PokemonCardType>("/pokemon-card/random", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });

  console.log("Random card:", response.data);
  return response.data;
},


  async getAllSeries(): Promise<PokemonSerieType[]> {
    const response = await api.get<PokemonSerieType[]>("/pokemon-series");
    return response.data;
  },

  async getAllSets(): Promise<PokemonSetType[]> {
    const response = await api.get<PokemonSetType[]>("/pokemon-set");
    return response.data;
  },

  async addToWishlist(
    userId: number,
    pokemonCardId: string
  ): Promise<CollectionItemType> {
    const response = await api.patch<CollectionItemType>(
      `/collection-item/wishlist/${userId}`,
      { pokemonCardId }
    );
    return response.data;
  },

  async addToFavorites(
    userId: number, 
    pokemonCardId: string
  ): Promise<CollectionItemType> {
    const response = await api.patch<CollectionItemType>(
      `/collection-item/favorites/${userId}`,
      { pokemonCardId }
    );
    console.log("Added to favorites:", response.data);
    return response.data;
  },
};
