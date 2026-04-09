"use client";

import { useQuery } from "@tanstack/react-query";
import { challengeService, ChallengeResponse } from "@/services/challenge.service";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Target, CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ChallengesPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<ChallengeResponse>({
    queryKey: ["challenges", "active"],
    queryFn: () => challengeService.getActiveChallenges(),
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">Could not load challenges.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          Complete daily and weekly challenges to earn XP and level up your player profile.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Daily Quests</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.daily.length ? (
            data.daily.map((entry) => (
              <ChallengeCard key={entry.id} activeChallenge={entry} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic col-span-2">No daily challenges available right now.</p>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Weekly Quests</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.weekly.length ? (
            data.weekly.map((entry) => (
              <ChallengeCard key={entry.id} activeChallenge={entry} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic col-span-2">No weekly challenges available right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
