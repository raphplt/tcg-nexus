import { authedFetch } from "@/utils/fetch";
import type { FeedItem } from "@/types/feed";

export const feedService = {
  async getFeed(limit: number = 30): Promise<FeedItem[]> {
    return authedFetch<FeedItem[]>("GET", "/feed", { params: { limit } });
  },
};
