export type NotificationFilter = "all" | "read" | "unread";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: { link?: string; [key: string]: unknown } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export type DevicePlatform = "expo" | "ios" | "android";
