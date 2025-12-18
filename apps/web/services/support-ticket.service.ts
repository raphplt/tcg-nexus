import {
  CreateSupportTicketDto,
  CreateSupportTicketMessageDto,
  SupportQueryParams,
  SupportTicket, SupportTicketMessage
} from "@/types/support-ticket";
import {authedFetch} from "@utils/fetch";
import {PaginatedResult} from "@/types/pagination";

export const supportTicketService = {
  async create(payload: CreateSupportTicketDto) {
    return authedFetch<SupportTicket>("POST", `/support/ticket`, { data: payload });
  },
  async createMessage(id: string | number,payload: CreateSupportTicketMessageDto): Promise<SupportTicketMessage> {
    return authedFetch<SupportTicketMessage>("POST", `/support/ticket/${id}/message`, { data: payload });
  },
  async getPaginated(
    params: SupportQueryParams,
  ): Promise<PaginatedResult<SupportTicket>> {
    return authedFetch<PaginatedResult<SupportTicket>>("GET", `/support/ticket`, {
      params: params as any,
    });
  },
  async getById(
    id: string | number
  ): Promise<PaginatedResult<SupportTicket>> {
    return authedFetch<PaginatedResult<SupportTicket>>("GET", `/support/ticket/${id}`);
  },
  async closeTicket(id: string | number) {
    return authedFetch("PATCH", `/support/ticket/${id}/close`);
  },
}