import { authedFetch } from "@/utils/fetch";
import {
  DeckEligibilityResult,
  OnlineMatchSessionView,
} from "@/types/match-online";

export const matchOnlineService = {
  async getDeckEligibility(matchId: number): Promise<DeckEligibilityResult> {
    return authedFetch<DeckEligibilityResult>(
      "GET",
      `/matches/${matchId}/online/deck-eligibility`,
    );
  },

  async getSession(matchId: number): Promise<OnlineMatchSessionView> {
    return authedFetch<OnlineMatchSessionView>(
      "GET",
      `/matches/${matchId}/online/session`,
    );
  },

  async createOrUpdateSession(
    matchId: number,
    deckId?: number,
  ): Promise<OnlineMatchSessionView> {
    return authedFetch<OnlineMatchSessionView>(
      "POST",
      `/matches/${matchId}/online/session`,
      {
        data: deckId ? { deckId } : {},
      },
    );
  },
};
