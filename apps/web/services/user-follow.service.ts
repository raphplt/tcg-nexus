import { authedFetch } from "@/utils/fetch";
import type { PublicUser } from "@/types/public-profile";

export const userFollowService = {
  async follow(userId: number): Promise<void> {
    await authedFetch("POST", `/users/${userId}/follow`);
  },

  async unfollow(userId: number): Promise<void> {
    await authedFetch("DELETE", `/users/${userId}/follow`);
  },

  async getFollowers(userId: number): Promise<PublicUser[]> {
    return authedFetch<PublicUser[]>("GET", `/users/${userId}/followers`);
  },

  async getFollowing(userId: number): Promise<PublicUser[]> {
    return authedFetch<PublicUser[]>("GET", `/users/${userId}/following`);
  },
};
