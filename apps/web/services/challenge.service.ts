import { authedFetch } from "@/utils/fetch";

export interface ChallengeData {
  id: number;
  title: string;
  description: string;
  type: "DAILY" | "WEEKLY";
  actionType: string;
  targetValue: number;
  rewardXp: number;
}

export interface ActiveChallengeData {
  id: number;
  expiresAt: string;
  challenge: ChallengeData;
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface ChallengeResponse {
  daily: ActiveChallengeData[];
  weekly: ActiveChallengeData[];
}

export const challengeService = {
  async getActiveChallenges(): Promise<ChallengeResponse> {
    return authedFetch<ChallengeResponse>("GET", "/challenges/active");
  },

  async claimChallenge(
    id: number,
  ): Promise<{ success: boolean; reward: number; newTotalXp: number }> {
    return authedFetch<{
      success: boolean;
      reward: number;
      newTotalXp: number;
    }>("POST", `/challenges/${id}/claim`);
  },
};
