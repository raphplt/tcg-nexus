import api from "../utils/fetch";
import type { PokemonCardType, PokemonSerieType } from "../types/cardPokemon";
import type { PaginatedResult, PaginationParams } from "../types/pagination";

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

  async getRandom(serieId?: string): Promise<PokemonCardType> {
    console.log("Fetching random card with serieId:", serieId);
    const response = await api.get<PokemonCardType>("/pokemon-card/random", {
      params: serieId ? { serieId } : undefined,
    });
    console.log("Random card:", response.data);
    return response.data;
  },

  async getAllSeries(): Promise<PokemonSerieType[]> {
    const response = await api.get<PokemonSerieType[]>("/pokemon-series");
    return response.data;
  },
};
