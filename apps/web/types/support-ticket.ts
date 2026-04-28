import { PaginationParams } from "@/types/pagination";
import { User } from "@/types/auth";

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
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export type SupportTicketStatus = "opened" | "closed";

export type SupportTicket = {
  id: number;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  user?: User;
  createdAt: string;
  updatedAt: string;
};

export type SupportTicketMessage = {
  id: number;
  message: string;
  isStaff: boolean;
  user: User;
  createdAt: string;
};

export type SupportTicketWithMessages = SupportTicket & {
  messages: SupportTicketMessage[];
};
