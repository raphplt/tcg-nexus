import {PaginationParams} from "@/types/pagination";
import {User} from "@/types/auth";

export interface CreateSupportTicketDto {
  subject: string;
  message: string;
}
export interface CreateSupportTicketMessageDto {
  message: string;
}

export interface SupportQueryParams extends PaginationParams {
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export type SupportTicket = {
  id: number;
  subject: string;
  message: string;
  user?: User
}
export type SupportTicketMessage = {
  id: number;
  message: string;
  user: User
}
