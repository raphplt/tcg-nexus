"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationService, Notification } from "@/services/notification.service";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for simplicity (as requested "simple")
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="p-4 flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="text-xs font-normal text-muted-foreground">{unreadCount} non lues</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer focus:bg-accent ${
                  !notification.isRead ? "bg-accent/50" : ""
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <span className={`text-sm font-semibold ${!notification.isRead ? "text-primary" : ""}`}>
                    {notification.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="p-2 text-center text-xs text-primary justify-center cursor-pointer">
          Voir toutes les notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
