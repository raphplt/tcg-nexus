"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { userService } from "@/services/user.service";
import { UserHeader } from "./UserHeader";
import { UserDecksTab } from "./UserDecksTab";
import { UserTournamentsTab } from "./UserTournamentsTab";
import { UserBadgesBlock } from "./UserBadgesBlock";
import { UserMarketplaceBlock } from "./UserMarketplaceBlock";

export default function UserPublicProfile() {
  const { id } = useParams();
  const userId = Number(id);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user-public", userId],
    queryFn: () => userService.getPublicProfile(userId),
    enabled: Number.isFinite(userId) && userId > 0,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  if (!Number.isFinite(userId) || userId <= 0) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !user) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <UserHeader user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="decks" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="decks">Decks publics</TabsTrigger>
              <TabsTrigger value="tournaments">Tournois</TabsTrigger>
            </TabsList>
            <TabsContent value="decks">
              <UserDecksTab userId={userId} />
            </TabsContent>
            <TabsContent value="tournaments">
              <UserTournamentsTab playerId={user.player?.id} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-6">
          <UserBadgesBlock userId={userId} />
          <UserMarketplaceBlock userId={userId} />
        </div>
      </div>
    </div>
  );
}
