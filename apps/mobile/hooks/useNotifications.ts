import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { notificationService } from "@/services/notification.service";
import type {
  NotificationFilter,
  NotificationItem,
  NotificationListResponse,
} from "@/types/notification";

const POLL_INTERVAL_MS = 60_000;

export function useNotifications(filter: NotificationFilter = "all"): {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
} {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPage = useCallback(
    async (
      pageToFetch: number,
      mode: "replace" | "append" = "replace",
    ): Promise<NotificationListResponse | null> => {
      try {
        const response = await notificationService.getNotifications({
          page: pageToFetch,
          limit: 20,
          filter,
        });
        setItems((previous) =>
          mode === "append" ? [...previous, ...response.data] : response.data,
        );
        setUnreadCount(response.unreadCount);
        setTotal(response.total);
        setPage(response.page);
        setTotalPages(response.totalPages);
        setError(null);
        return response;
      } catch (err) {
        setError(err as Error);
        return null;
      }
    },
    [filter],
  );

  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchPage(1, "replace");
    setIsRefreshing(false);
  }, [fetchPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (page >= totalPages) return;
    await fetchPage(page + 1, "append");
  }, [fetchPage, page, totalPages]);

  const markAsRead = useCallback(async (id: number): Promise<void> => {
    await notificationService.markAsRead(id);
    setItems((previous) =>
      previous.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    await notificationService.markAllAsRead();
    setItems((previous) => previous.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchPage(1, "replace").finally(() => setIsLoading(false));
  }, [fetchPage]);

  useEffect(() => {
    pollTimer.current = setInterval(() => {
      void fetchPage(1, "replace");
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchPage]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") {
          void fetchPage(1, "replace");
        }
      },
    );
    return () => subscription.remove();
  }, [fetchPage]);

  return {
    items,
    unreadCount,
    total,
    page,
    totalPages,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
