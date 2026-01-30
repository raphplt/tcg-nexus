import { authedFetch } from "@/utils/fetch";
import { User, UserRole } from "@/types/auth";
import { PaginatedResult, PaginationParams } from "@/types/pagination";
import { Order, OrderStatus } from "@/types/order";
import { Listing } from "@/types/listing";
import {
  CreateTournamentDto,
  Tournament,
  TournamentStatus,
} from "@/types/tournament";
import {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import { PokemonCardsType } from "@/types/enums/pokemonCardsType";
import { EnergyType } from "@/types/enums/energyType";
import { TrainerType } from "@/types/enums/trainerType";

export interface AdminOrderFilters extends PaginationParams {
  status?: OrderStatus;
  buyerId?: number;
  sellerId?: number;
}

export interface ListingFilters extends PaginationParams {
  sellerId?: number;
  search?: string;
}

type UserPayload = {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role?: UserRole;
  isPro?: boolean;
  isActive?: boolean;
};

export type PokemonSeriePayload = {
  id: string;
  name: string;
  logo?: string;
};

export type PokemonSetPayload = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  tcgOnline?: string;
  releaseDate: string;
  serieId?: string;
  cardCount?: {
    total?: number;
    official?: number;
    reverse?: number;
    holo?: number;
    firstEd?: number;
  };
  legal?: {
    standard?: boolean;
    expanded?: boolean;
  };
};

export type PokemonCardPayload = {
  setId: string;
  tcgDexId?: string;
  localId?: string;
  name?: string;
  image?: string;
  category?: PokemonCardsType;
  illustrator?: string;
  rarity?: string;
  variants?: {
    normal?: boolean;
    reverse?: boolean;
    holo?: boolean;
    firstEdition?: boolean;
  };
  dexId?: number[];
  hp?: number;
  types?: string[];
  description?: string;
  regulationMark?: string;
  trainerType?: TrainerType;
  energyType?: EnergyType;
};

export const adminService = {
  async getUsers(): Promise<User[]> {
    return authedFetch<User[]>("GET", "/users");
  },

  async createUser(payload: UserPayload): Promise<User> {
    return authedFetch<User>("POST", "/users", { data: payload });
  },

  async updateUser(id: number, payload: Partial<UserPayload>): Promise<User> {
    return authedFetch<User>("PATCH", `/users/${id}`, { data: payload });
  },

  async deleteUser(id: number): Promise<void> {
    return authedFetch<void>("DELETE", `/users/${id}`);
  },

  async getOrders(
    filters: AdminOrderFilters = {},
  ): Promise<PaginatedResult<Order>> {
    return authedFetch<PaginatedResult<Order>>(
      "GET",
      "/marketplace/admin/orders",
      { params: filters as any },
    );
  },

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<Order> {
    return authedFetch<Order>(
      "PATCH",
      `/marketplace/admin/orders/${orderId}/status`,
      {
        data: { status },
      },
    );
  },

  async getListings(
    filters: ListingFilters = {},
  ): Promise<PaginatedResult<Listing>> {
    return authedFetch<PaginatedResult<Listing>>(
      "GET",
      "/marketplace/listings",
      {
        params: filters as any,
      },
    );
  },

  async getTournaments(
    params: PaginationParams & { status?: TournamentStatus; search?: string } =
      {},
  ): Promise<PaginatedResult<Tournament>> {
    return authedFetch<PaginatedResult<Tournament>>("GET", "/tournaments", {
      params: params as any,
    });
  },

  async createTournament(payload: CreateTournamentDto): Promise<Tournament> {
    return authedFetch<Tournament>("POST", "/tournaments", { data: payload });
  },

  async updateTournament(
    id: number,
    payload: Partial<CreateTournamentDto> & { status?: TournamentStatus },
  ): Promise<Tournament> {
    return authedFetch<Tournament>("PATCH", `/tournaments/${id}`, {
      data: payload,
    });
  },

  async updateTournamentStatus(
    id: number,
    status: TournamentStatus,
  ): Promise<Tournament> {
    return authedFetch<Tournament>("PATCH", `/tournaments/${id}/status`, {
      data: { status },
    });
  },

  async deleteTournament(id: number): Promise<void> {
    return authedFetch<void>("DELETE", `/tournaments/${id}`);
  },

  async getPokemonSeries(): Promise<PokemonSerieType[]> {
    return authedFetch<PokemonSerieType[]>("GET", "/pokemon-series");
  },

  async createPokemonSerie(payload: PokemonSeriePayload): Promise<PokemonSerieType> {
    return authedFetch<PokemonSerieType>("POST", "/pokemon-series", {
      data: payload,
    });
  },

  async updatePokemonSerie(
    id: string,
    payload: Partial<PokemonSeriePayload>,
  ): Promise<PokemonSerieType> {
    return authedFetch<PokemonSerieType>("PATCH", `/pokemon-series/${id}`, {
      data: payload,
    });
  },

  async deletePokemonSerie(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/pokemon-series/${id}`);
  },

  async getPokemonSets(): Promise<PokemonSetType[]> {
    return authedFetch<PokemonSetType[]>("GET", "/pokemon-set");
  },

  async createPokemonSet(payload: PokemonSetPayload): Promise<PokemonSetType> {
    const { serieId, cardCount, legal, ...rest } = payload;
    const formattedCardCount =
      cardCount &&
      Object.values(cardCount).some((value) => value !== undefined)
        ? cardCount
        : undefined;
    const formattedLegal =
      legal &&
      (legal.standard !== undefined || legal.expanded !== undefined)
        ? legal
        : undefined;

    return authedFetch<PokemonSetType>("POST", "/pokemon-set", {
      data: {
        ...rest,
        serie: serieId ? { id: serieId } : undefined,
        cardCount: formattedCardCount,
        legal: formattedLegal,
      },
    });
  },

  async updatePokemonSet(
    id: string,
    payload: Partial<PokemonSetPayload>,
  ): Promise<PokemonSetType> {
    const { serieId, cardCount, legal, ...rest } = payload;
    const formattedCardCount =
      cardCount &&
      Object.values(cardCount).some((value) => value !== undefined)
        ? cardCount
        : undefined;
    const formattedLegal =
      legal &&
      (legal.standard !== undefined || legal.expanded !== undefined)
        ? legal
        : undefined;

    return authedFetch<PokemonSetType>("PATCH", `/pokemon-set/${id}`, {
      data: {
        ...rest,
        serie: serieId ? { id: serieId } : undefined,
        cardCount: formattedCardCount,
        legal: formattedLegal,
      },
    });
  },

  async deletePokemonSet(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/pokemon-set/${id}`);
  },

  async getPokemonCards(
    params: PaginationParams = {},
  ): Promise<PaginatedResult<PokemonCardType>> {
    return authedFetch<PaginatedResult<PokemonCardType>>(
      "GET",
      "/pokemon-card/paginated",
      {
        params: params as any,
      },
    );
  },

  async searchPokemonCards(search: string): Promise<PokemonCardType[]> {
    return authedFetch<PokemonCardType[]>(
      "GET",
      `/pokemon-card/search/${encodeURIComponent(search)}`,
    );
  },

  async createPokemonCard(payload: PokemonCardPayload): Promise<PokemonCardType> {
    const { setId, types, ...rest } = payload;
    const formattedTypes =
      types && types.length > 0 ? types.filter(Boolean).map((t) => t.trim()) : undefined;

    return authedFetch<PokemonCardType>("POST", "/pokemon-card", {
      data: {
        ...rest,
        set: setId ? { id: setId } : undefined,
        types: formattedTypes,
      },
    });
  },

  async updatePokemonCard(
    id: string,
    payload: Partial<PokemonCardPayload>,
  ): Promise<PokemonCardType> {
    const { setId, types, ...rest } = payload;
    const formattedTypes =
      types && types.length > 0 ? types.filter(Boolean).map((t) => t.trim()) : undefined;

    return authedFetch<PokemonCardType>("PATCH", `/pokemon-card/${id}`, {
      data: {
        ...rest,
        set: setId ? { id: setId } : undefined,
        types: formattedTypes,
      },
    });
  },

  async deletePokemonCard(id: string): Promise<void> {
    return authedFetch<void>("DELETE", `/pokemon-card/${id}`);
  },
};
