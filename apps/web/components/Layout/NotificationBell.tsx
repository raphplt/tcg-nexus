"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Swords,
  Trophy,
  User,
  Info,
  ExternalLink,
} from "lucide-react";

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Helper to format relative time in French
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} j`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match_invite":
      case "match_started":
      case "match_finished":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <Swords className="h-4 w-4" />
          </div>
        );
      case "tournament_created":
      case "tournament_started":
      case "tournament_finished":
      case "round_started":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case "follow":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
            <User className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-500">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }

    if (n.data) {
      if (n.data.casualSessionId) {
        router.push(`/play/casual/${n.data.casualSessionId}`);
        setIsOpen(false);
      } else if (n.data.matchId && n.data.tournamentId) {
        router.push(
          `/tournaments/${n.data.tournamentId}/matches/${n.data.matchId}`,
        );
        setIsOpen(false);
      } else if (n.data.tournamentId) {
        router.push(`/tournaments/${n.data.tournamentId}`);
        setIsOpen(false);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full border border-border bg-background/50 hover:bg-accent/80 hover:text-accent-foreground"
          aria-label="Open notifications"
        >
          <div className="relative">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5 text-amber-500 animate-[pulse_2s_infinite]" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground ring-2 ring-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0 border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20"
              >
                {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout lire
            </Button>
          )}
        </div>

        <ScrollArea className="h-[360px] w-full">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-xs gap-2">
              <span className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent rounded-full" />
              Chargement des notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground text-center px-6 gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                <Bell className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm text-foreground">
                  Aucune notification
                </p>
                <p className="text-xs text-muted-foreground">
                  Vous êtes à jour ! Toutes les alertes s'afficheront ici.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((n) => {
                const hasAction =
                  n.data &&
                  (n.data.casualSessionId ||
                    n.data.matchId ||
                    n.data.tournamentId);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer group hover:bg-muted/30 ${
                      !n.isRead ? "bg-amber-500/[0.02]" : ""
                    }`}
                  >
                    {!n.isRead && (
                      <span className="absolute left-2 top-[22px] h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}

                    <div className="shrink-0 mt-0.5 ml-1">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1 pr-6">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs font-semibold leading-none ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground select-none shrink-0">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs leading-normal text-muted-foreground">
                        {n.body}
                      </p>

                      {/* CTA dynamic button */}
                      {hasAction && (
                        <div className="pt-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[10px] font-medium bg-accent/60 hover:bg-accent rounded-md gap-1"
                          >
                            {n.data?.casualSessionId
                              ? "Rejoindre la partie"
                              : "Accéder au match"}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="h-6 w-6 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="Marquer comme lu"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="h-6 w-6 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
