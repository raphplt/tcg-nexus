import { authedFetch } from "@/utils/fetch";
import type { CasualLobbyView, CasualSessionView } from "@/types/casual-match";

export const casualMatchService = {
  async getLobby(): Promise<CasualLobbyView> {
    return authedFetch<CasualLobbyView>("GET", "/casual-matches/lobby");
  },

  async getSession(sessionId: number): Promise<CasualSessionView> {
    return authedFetch<CasualSessionView>(
      "GET",
      `/casual-matches/${sessionId}`,
    );
  },

  async selectDeck(
    sessionId: number,
    deckId: number,
  ): Promise<CasualSessionView> {
    return authedFetch<CasualSessionView>(
      "POST",
      `/casual-matches/${sessionId}/deck`,
      { data: { deckId } },
    );
  },

  async dispatchAction(
    sessionId: number,
    action: Record<string, unknown>,
  ): Promise<CasualSessionView> {
    return authedFetch<CasualSessionView>(
      "POST",
      `/casual-matches/${sessionId}/action`,
      { data: { action } },
    );
  },

  async respondPrompt(
    sessionId: number,
    response: Record<string, unknown>,
  ): Promise<CasualSessionView> {
    return authedFetch<CasualSessionView>(
      "POST",
      `/casual-matches/${sessionId}/prompt`,
      { data: { response } },
    );
  },
};
