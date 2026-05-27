"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { notificationService } from "@/services/notification.service";
import { UserNotification } from "@/types/notification";
import { API_BASE_URL } from "@/utils/fetch";
import toast from "react-hot-toast";

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = React.useRef<Socket | null>(null);

  const socketBaseUrl = useMemo(() => {
    if (API_BASE_URL.startsWith("http")) {
      return API_BASE_URL;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return new URL(API_BASE_URL, window.location.origin).toString();
  }, []);

  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await notificationService.getNotifications(page, limit);
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setNotifications((currentNotifications) => {
        const target = currentNotifications.find((n) => n.id === id);
        if (target && !target.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return currentNotifications;
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, []);

  // Chargement initial des notifications
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Connexion WebSocket
  useEffect(() => {
    if (!isAuthenticated || !socketBaseUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const socket = io(`${socketBaseUrl}/notification`, {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to notification gateway");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from notification gateway");
    });

    socket.on("new_notification", (newNotification: UserNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);


      toast(
        (t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{newNotification.title}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{newNotification.body}</span>
          </div>
        ),
        {
          icon: "🔔",
          duration: 4000,
          position: "top-right",
        }
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, socketBaseUrl]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        isConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
