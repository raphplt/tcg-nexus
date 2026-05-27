export interface UserNotification {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  data: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotifications {
  data: UserNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}
