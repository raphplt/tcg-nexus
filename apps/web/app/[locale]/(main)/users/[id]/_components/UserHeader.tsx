"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Trophy, UserPlus, UserMinus, Users } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { userFollowService } from "@/services/user-follow.service";
import type { PublicUser } from "@/types/public-profile";

interface UserHeaderProps {
  user: PublicUser;
}

export function UserHeader({ user }: UserHeaderProps) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = currentUser?.id === user.id;
  const showFollow = isAuthenticated && !isOwnProfile;

  const followMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        await userFollowService.follow(user.id);
      } else {
        await userFollowService.unfollow(user.id);
      }
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData<PublicUser>(["user-public", user.id], (prev) =>
        prev
          ? {
              ...prev,
              isFollowing: next,
              followersCount: Math.max(
                0,
                (prev.followersCount ?? 0) + (next ? 1 : -1),
              ),
            }
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["user-followers", user.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const isFollowing = !!user.isFollowing;

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
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1"
            >
              <Trophy className="h-3 w-3" />
              ELO {user.player.elo}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{user.followersCount ?? 0}</span>
            <span className="text-muted-foreground">abonnés</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold">{user.followingCount ?? 0}</span>
            <span className="text-muted-foreground">abonnements</span>
          </span>
        </div>
      </div>

      {showFollow && (
        <Button
          variant={isFollowing ? "secondary" : "default"}
          className="gap-2"
          disabled={followMutation.isPending}
          onClick={() => followMutation.mutate(!isFollowing)}
        >
          {isFollowing ? (
            <>
              <UserMinus className="h-4 w-4" />
              Ne plus suivre
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Suivre
            </>
          )}
        </Button>
      )}
    </Card>
  );
}
