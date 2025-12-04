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
};
