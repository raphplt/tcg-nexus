import { PaginatedNotifications, UserNotification } from "@/types/notification";
import { authedFetch } from "@/utils/fetch";

export const notificationService = {
  async getNotifications(page = 1, limit = 20): Promise<PaginatedNotifications> {
    return authedFetch<PaginatedNotifications>("GET", `/notifications?page=${page}&limit=${limit}`);
  },

  async markAsRead(id: number): Promise<UserNotification> {
    return authedFetch<UserNotification>("PATCH", `/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<{ success: boolean; updatedCount: number }> {
    return authedFetch<{ success: boolean; updatedCount: number }>("POST", "/notifications/read-all");
  },

  async deleteNotification(id: number): Promise<{ success: boolean }> {
    return authedFetch<{ success: boolean }>("DELETE", `/notifications/${id}`);
  },

  async registerToken(token: string, platform = "web"): Promise<any> {
    return authedFetch<any>("POST", "/notifications/tokens", {
      data: { token, platform },
    });
  },

  async unregisterToken(token: string): Promise<{ success: boolean }> {
    return authedFetch<{ success: boolean }>("DELETE", `/notifications/tokens/${token}`);
  },
};
