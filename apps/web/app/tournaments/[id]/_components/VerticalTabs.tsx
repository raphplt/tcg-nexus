"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Swords,
  Trophy,
  ScrollText,
  UserCircle,
} from "lucide-react";

export type TabId =
  | "overview"
  | "participants"
  | "matches"
  | "rankings"
  | "rules"
  | "organizers";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface VerticalTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  participantCount?: number;
  matchesCount?: number;
}

export function VerticalTabs({
  activeTab,
  onTabChange,
  participantCount = 0,
  matchesCount = 0,
}: VerticalTabsProps) {
  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Aperçu",
      icon: <LayoutDashboard className="size-5" />,
    },
    {
      id: "participants",
      label: "Participants",
      icon: <Users className="size-5" />,
      badge: participantCount,
    },
    {
      id: "matches",
      label: "Matches",
      icon: <Swords className="size-5" />,
      badge: matchesCount,
    },
    {
      id: "rankings",
      label: "Classement",
      icon: <Trophy className="size-5" />,
    },
    {
      id: "rules",
      label: "Règles",
      icon: <ScrollText className="size-5" />,
    },
    {
      id: "organizers",
      label: "Organisation",
      icon: <UserCircle className="size-5" />,
    },
  ];

  return (
    <nav className="space-y-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
            "hover:bg-muted/80",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "transition-colors",
              activeTab === tab.id ? "text-primary-foreground" : "",
            )}
          >
            {tab.icon}
          </span>
          <span className="font-medium flex-1">{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded-full",
                activeTab === tab.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

// Version mobile avec tabs horizontaux scrollables
export function MobileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Aperçu",
      icon: <LayoutDashboard className="size-4" />,
    },
    {
      id: "participants",
      label: "Joueurs",
      icon: <Users className="size-4" />,
    },
    { id: "matches", label: "Matches", icon: <Swords className="size-4" /> },
    {
      id: "rankings",
      label: "Classement",
      icon: <Trophy className="size-4" />,
    },
    { id: "rules", label: "Règles", icon: <ScrollText className="size-4" /> },
    {
      id: "organizers",
      label: "Orga",
      icon: <UserCircle className="size-4" />,
    },
  ];

  return (
    <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all",
            "border text-sm font-medium shrink-0",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
