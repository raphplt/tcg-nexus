import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  NotificationFilter,
  NotificationListResponse,
} from "../types/notification";
import { secureApi } from "./secureApi";

const TOKEN_STORAGE_KEY = "expo_push_token";

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  filter?: NotificationFilter;
}

export const notificationService = {
  async getNotifications(
    params: GetNotificationsParams = {},
  ): Promise<NotificationListResponse> {
    const { page = 1, limit = 20, filter = "all" } = params;
    const response = await secureApi.get<NotificationListResponse>(
      "/notifications",
      { params: { page, limit, filter } },
    );
    return response.data;
  },

  async markAsRead(id: number): Promise<void> {
    await secureApi.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await secureApi.patch("/notifications/read-all");
  },

  async registerDevice(token: string): Promise<void> {
    await secureApi.post("/notifications/register-device", {
      token,
      platform: Platform.OS,
    });
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  },

  async unregisterDevice(): Promise<void> {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }
    try {
      await secureApi.delete(
        `/notifications/tokens/${encodeURIComponent(token)}`,
      );
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    }
  },

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  },
};
