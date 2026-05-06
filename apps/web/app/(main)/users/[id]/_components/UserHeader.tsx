// apps/web/app/(main)/users/[id]/_components/UserHeader.tsx
"use client";

import { Calendar, Trophy, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { PublicUser } from "@/types/public-profile";

interface UserHeaderProps {
  user: PublicUser;
}

export function UserHeader({ user }: UserHeaderProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const showFollow = isAuthenticated && currentUser?.id !== user.id;

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <Card className="p-6 flex flex-col md:flex-row md:items-center gap-6">
      <Avatar className="h-24 w-24">
        <AvatarImage src={user.avatarUrl ?? undefined} alt={fullName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <h1 className="text-2xl font-bold">{fullName}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Inscrit le {format(new Date(user.createdAt), "dd/MM/yyyy")}
          </span>
          {user.player && (
            <Badge variant="secondary" className="inline-flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              ELO {user.player.elo}
            </Badge>
          )}
        </div>
      </div>

      {showFollow && (
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            /* placeholder — follow logic ships in a follow-up ticket */
          }}
        >
          <UserPlus className="h-4 w-4" />
          Suivre
        </Button>
      )}
    </Card>
  );
}
