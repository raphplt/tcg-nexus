import type { JustePrixItemsResponse } from "@/types/mini-game";
import { api } from "@/utils/fetch";

/** REST surface of the mini-games (solo and local modes). */
export const miniGameService = {
  /**
   * Draws priced items for a solo or local Juste Prix game.
   *
   * @param count Number of rounds.
   * @param setId Optional set restriction for the cards.
   */
  async getJustePrixItems(
    count: number,
    setId?: string,
  ): Promise<JustePrixItemsResponse> {
    const response = await api.get<JustePrixItemsResponse>(
      "/mini-game/juste-prix/items",
      { params: { count, setId: setId || undefined } },
    );
    return response.data;
  },
};
