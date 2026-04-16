import { secureApi } from "@/utils/fetch";

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    const response = await secureApi.get<Notification[]>("/notifications");
    return response.data;
  },

  async markAsRead(id: number): Promise<Notification> {
    const response = await secureApi.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },
};
