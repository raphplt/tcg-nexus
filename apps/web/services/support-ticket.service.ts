import {
  CreateSupportTicketDto,
  CreateSupportTicketMessageDto,
  SupportQueryParams,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketWithMessages,
} from "@/types/support-ticket";
import { authedFetch } from "@utils/fetch";
import { PaginatedResult } from "@/types/pagination";

export const supportTicketService = {
  async create(payload: CreateSupportTicketDto): Promise<SupportTicket> {
    return authedFetch<SupportTicket>("POST", `/support/tickets`, {
      data: payload,
    });
  },

  async createMessage(
    id: string | number,
    payload: CreateSupportTicketMessageDto,
  ): Promise<SupportTicketMessage> {
    return authedFetch<SupportTicketMessage>(
      "POST",
      `/support/tickets/${id}/messages`,
      { data: payload },
    );
  },

  async getPaginated(
    params: SupportQueryParams = {},
  ): Promise<PaginatedResult<SupportTicket>> {
    return authedFetch<PaginatedResult<SupportTicket>>(
      "GET",
      `/support/tickets`,
      { params: params as any },
    );
  },

  async getById(id: string | number): Promise<SupportTicketWithMessages> {
    return authedFetch<SupportTicketWithMessages>(
      "GET",
      `/support/tickets/${id}`,
    );
  },

  async closeTicket(id: string | number): Promise<SupportTicket> {
    return authedFetch<SupportTicket>(
      "PATCH",
      `/support/tickets/${id}/close`,
    );
  },
};
