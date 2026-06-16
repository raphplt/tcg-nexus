import { authedFetch } from "@/utils/fetch";
import type { PublicUserBadge } from "@/types/public-profile";

export const badgeService = {
  async getUserBadges(userId: number): Promise<PublicUserBadge[]> {
    return authedFetch<PublicUserBadge[]>("GET", `/badges/user/${userId}`);
  },
};
